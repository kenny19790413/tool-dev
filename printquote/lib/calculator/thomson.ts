// ============================================================
// PrintQuote 計算エンジン — トムソン加工費計算
// ============================================================

import { roundUp100 } from './utils';
import type { DieMoldMaster, MoldUnitPriceTable } from './types';

/**
 * 木型代
 *
 * 型あり（hasMold=true）→ moldData.baseMoldCost（保管型は 0）
 * 型なし（hasMold=false）→ 版数 × 木型単価テーブル[複雑度] × 丁付け数
 *
 * @param hasMold        型あり/なし
 * @param moldData       型マスタ（型ありの場合）
 * @param moldComplexity 複雑度 1〜5（型なしの場合）
 * @param moldUnitPrices 木型単価テーブル {1: 3000, 2: 5000, ...}
 * @param plateCount     版数（表度数+裏度数-コーター数）
 * @param faces          丁付け数
 */
function calcMoldCost(
  hasMold: boolean,
  moldData: DieMoldMaster | null,
  moldComplexity: number,
  moldUnitPrices: MoldUnitPriceTable,
  plateCount: number,
  faces: number
): number {
  if (hasMold && moldData) {
    return moldData.baseMoldCost; // 保管型は 0 または保管料のみ
  }

  const moldUnitPrice = moldUnitPrices[moldComplexity];
  if (moldUnitPrice === undefined)
    throw new Error(`木型単価テーブルに複雑度 ${moldComplexity} が定義されていません`);

  return plateCount * moldUnitPrice * faces;
}

/**
 * 組付け費（刃を組む工程）
 *
 * 組付け単価 = 2,500 + 丁付け数 × 500 円
 * 組付け費 = 版数 × 組付け単価
 */
function calcAssemblyCost(plateCount: number, faces: number): number {
  const unitPrice = 2500 + faces * 500;
  return plateCount * unitPrice;
}

/**
 * 抜き費（打ち抜き工程）
 *
 * 抜き通し数 = quantity / 丁付け数
 * 抜き費 = ROUNDUP(6,000 + 抜き通し数 × 2.5, -2)
 */
function calcPunchCost(quantity: number, faces: number): number {
  const punchPasses = quantity / faces;
  return roundUp100(6000 + punchPasses * 2.5);
}

/**
 * トムソン加工費合計
 *
 * = 木型代 + 組付け費 + 抜き費
 */
export function calcThomsonCost(params: {
  hasMold: boolean;
  moldData: DieMoldMaster | null;
  moldComplexity: number;
  moldUnitPriceTable: MoldUnitPriceTable;
  plateCount: number;  // 表度数 + 裏度数 - コーター数
  faces: number;
  quantity: number;
}): number {
  const { hasMold, moldData, moldComplexity, moldUnitPriceTable, plateCount, faces, quantity } = params;

  const moldCost = calcMoldCost(hasMold, moldData, moldComplexity, moldUnitPriceTable, plateCount, faces);
  const assemblyCost = calcAssemblyCost(plateCount, faces);
  const punchCost = calcPunchCost(quantity, faces);

  return moldCost + assemblyCost + punchCost;
}
