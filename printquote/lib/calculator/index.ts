// ============================================================
// PrintQuote 計算エンジン — メインエントリ
// ============================================================

import { calcIntermediate } from './base';
import { calcPaperCost } from './paper';
import { calcPlateCost } from './plate';
import { calcPrintCost, calcInkCost } from './print';
import {
  calcCuttingCost,
  calcPressCost,
  calcPpCost,
  calcEmbossCost,
  calcFoilCost,
  calcLaminationCost,
  calcCorrugatedCost,
} from './processing';
import { calcThomsonCost } from './thomson';
import { roundUp100 } from './utils';
import type { CalcInput, CalcCostBreakdown, CalcResult } from './types';

// コーター数（版数計算用）
const COATER_DEDUCT = { none: 0, single: 1, double: 2 } as const;

/**
 * 全費目を一括計算して CalcResult を返す
 *
 * @param input 計算入力（仕様 + マスタデータ）
 */
export function calculate(input: CalcInput): CalcResult {
  const {
    productType, quantity, faces, cuts,
    frontColors, backColors, coater, colorType,
    widthMm, heightMm,
    processTypes, processingPriceMasters, printPriceMasters,
    paper, wasteRate, hasThomson,
    hasMold, moldData, moldComplexity, moldUnitPriceTable,
    overheadRate,
    foilUnitPrice,
    packingCost: packingInput,
    deliveryCost: deliveryInput,
    outsourceCosts,
  } = {
    widthMm: input.paper.widthMm,
    heightMm: input.paper.heightMm,
    ...input,
  };

  // ── 基本値 ────────────────────────────────────────────────
  const inter = calcIntermediate(input);
  const { actualSheets, totalSheets, passes } = inter;
  const plateCount = frontColors + backColors - COATER_DEDUCT[coater];

  // ── 費目計算（選択されていない加工は 0） ──────────────────
  const has = (p: string) => processTypes.includes(p as typeof processTypes[number]);

  const breakdown: CalcCostBreakdown = {
    paperCost: calcPaperCost(paper, totalSheets, productType),

    plateCost: calcPlateCost(frontColors, backColors, coater, faces),

    printCost: calcPrintCost(printPriceMasters, colorType, frontColors, backColors, passes),

    inkCost: calcInkCost(widthMm, heightMm, passes),

    cuttingCost: has('cutting')
      ? calcCuttingCost(processingPriceMasters, quantity, productType)
      : 0,

    pressCost: has('press')
      ? calcPressCost(processingPriceMasters, actualSheets, widthMm, heightMm, productType)
      : 0,

    ppCost: has('pp')
      ? calcPpCost(processingPriceMasters, actualSheets, widthMm, heightMm, productType)
      : 0,

    embossCost: has('emboss')
      ? calcEmbossCost(processingPriceMasters, actualSheets, productType)
      : 0,

    foilCost: has('foil') && foilUnitPrice !== undefined
      ? calcFoilCost(quantity, foilUnitPrice)
      : 0,

    laminationCost: has('lamination')
      ? calcLaminationCost(processingPriceMasters, actualSheets, widthMm, heightMm, productType)
      : 0,

    corrugatedCost: has('corrugated')
      ? calcCorrugatedCost(processingPriceMasters, actualSheets, widthMm, heightMm, productType)
      : 0,

    thomsonCost: has('thomson') && hasThomson
      ? calcThomsonCost({
          hasMold,
          moldData,
          moldComplexity,
          moldUnitPriceTable,
          plateCount,
          faces,
          quantity,
        })
      : 0,

    bindingCost: outsourceCosts?.binding ?? 0,
    packingCost: packingInput ?? 0,
    deliveryCost: deliveryInput ?? 0,

    outsourceCost: outsourceCosts
      ? Object.entries(outsourceCosts)
          .filter(([key]) => !['binding'].includes(key)) // binding は bindingCost に計上済み
          .reduce((sum, [, v]) => sum + (v ?? 0), 0)
      : 0,
  };

  // ── 合計 ──────────────────────────────────────────────────
  const subtotal = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const overheadAmount = Math.round(subtotal * overheadRate / 100);
  const total = roundUp100(subtotal + overheadAmount);
  const unitPrice = quantity > 0 ? total / quantity : 0;

  return {
    quantity,
    intermediate: inter,
    breakdown,
    subtotal,
    overheadAmount,
    total,
    unitPrice,
  };
}

/**
 * 数量バリエーション計算
 * 同一仕様で複数数量をまとめて計算する
 *
 * @param base      ベース入力（quantity 以外の仕様）
 * @param quantities 数量リスト
 */
export function calculateVariants(
  base: Omit<CalcInput, 'quantity'>,
  quantities: number[]
): CalcResult[] {
  return quantities.map((q) => calculate({ ...base, quantity: q }));
}

export { calcImpositionSuggestions } from './imposition';
export type { CalcInput, CalcResult, CalcCostBreakdown, ImpositionCandidate } from './types';
