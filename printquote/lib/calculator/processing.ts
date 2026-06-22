// ============================================================
// PrintQuote 計算エンジン — 加工費計算
// 断裁 / プレス / PP / エンボス / 箔押し / 合紙 / 片段合紙
// ============================================================

import { roundUp100, roundUp1, areaM2 } from './utils';
import type { ProcessingPriceMaster, ProductType } from './types';

// ── ユーティリティ ─────────────────────────────────────────

/** マスタを processType と productType で絞り込む */
function findMaster(
  masters: ProcessingPriceMaster[],
  processType: string,
  productType: ProductType
): ProcessingPriceMaster {
  const matched =
    masters.find((m) => m.processType === processType && m.productType === productType) ??
    masters.find((m) => m.processType === processType && m.productType === null);

  if (!matched)
    throw new Error(`加工単価マスタが見つかりません: processType=${processType}`);
  return matched;
}

// ── 断裁 ──────────────────────────────────────────────────

/**
 * 断裁費（4段階固定/従量）
 *
 * 枚数 < 3,000       → 1,500円（固定）
 * 3,000 ≦ 枚数 < 10,000  → 2,000円（固定）
 * 10,000 ≦ 枚数 < 20,000 → 3,000円（固定）
 * 枚数 ≧ 20,000      → 0.25円/枚（従量）
 *
 * @param masters  加工単価マスタ（断裁の全段階が入っている想定）
 * @param quantity 受注数量（枚）
 */
export function calcCuttingCost(
  masters: ProcessingPriceMaster[],
  quantity: number,
  productType: ProductType
): number {
  // 断裁は複数閾値レコードを全件取得し、昇順ソートして段階的マッチング
  const cuttingMasters = masters
    .filter((m) => m.processType === 'cutting' && (m.productType === null || m.productType === productType))
    .sort((a, b) => a.threshold - b.threshold);

  if (cuttingMasters.length === 0)
    throw new Error('断裁マスタが見つかりません');

  // 固定費レコード（perSheetPrice = null）を threshold 昇順でチェック
  for (const m of cuttingMasters.filter((m) => m.perSheetPrice === null)) {
    if (quantity < m.threshold) {
      return m.fixedPrice;
    }
  }

  // 全固定帯を超えた → 従量レコード（perSheetPrice が設定されているもの）を使用
  const perSheetRecord = cuttingMasters.find((m) => m.perSheetPrice !== null);
  const perSheetPrice = perSheetRecord?.perSheetPrice ?? 0.25;
  return Math.round(quantity * perSheetPrice);
}

// ── プレス（ニス引き等） ───────────────────────────────────

/**
 * プレス費
 *
 * 通し数 = 実枚数 + 100
 * ≦ 640 → 8,000円固定
 * > 640 → ROUNDUP((面積m² × 14 + 4) 円/通し × 通し数, -2)
 */
export function calcPressCost(
  masters: ProcessingPriceMaster[],
  actualSheets: number,
  widthMm: number,
  heightMm: number,
  productType: ProductType
): number {
  const m = findMaster(masters, 'press', productType);
  const passes = actualSheets + 100;

  if (passes <= m.threshold) return m.fixedPrice;

  const unitPrice = roundUp1(areaM2(widthMm, heightMm) * (m.coeffA ?? 14) + (m.coeffB ?? 4));
  return roundUp100(passes * unitPrice);
}

// ── PP加工（グロス・マット） ───────────────────────────────

/**
 * PP費
 *
 * 通し数 = 実枚数 + 100
 * ≦ 500 → 10,000円固定
 * > 500 → ROUNDUP((面積m² × 27 + 11) 円/通し × 通し数, -2)
 */
export function calcPpCost(
  masters: ProcessingPriceMaster[],
  actualSheets: number,
  widthMm: number,
  heightMm: number,
  productType: ProductType
): number {
  const m = findMaster(masters, 'pp', productType);
  const passes = actualSheets + 100;

  if (passes <= m.threshold) return m.fixedPrice;

  const unitPrice = roundUp1(areaM2(widthMm, heightMm) * (m.coeffA ?? 27) + (m.coeffB ?? 11));
  return roundUp100(passes * unitPrice);
}

// ── エンボス ──────────────────────────────────────────────

/**
 * エンボス費
 *
 * 通し数 = 実枚数 + 100
 * ≦ 1,500 → 6,000円固定
 * > 1,500 → ROUNDUP(通し数 × 4円, -2)
 */
export function calcEmbossCost(
  masters: ProcessingPriceMaster[],
  actualSheets: number,
  productType: ProductType
): number {
  const m = findMaster(masters, 'emboss', productType);
  const passes = actualSheets + 100;

  if (passes <= m.threshold) return m.fixedPrice;

  const perPass = m.perSheetPrice ?? 4;
  return roundUp100(passes * perPass);
}

// ── 箔押し ────────────────────────────────────────────────

/**
 * 箔押し費（版代は別途トムソンの木型代で計上）
 *
 * 箔押し費 = 枚数 × 単価（単価は手入力 or マスタ）
 */
export function calcFoilCost(
  quantity: number,
  foilUnitPrice: number
): number {
  return roundUp100(quantity * foilUnitPrice);
}

// ── 合紙（両面貼り） ───────────────────────────────────────

/**
 * 合紙費
 *
 * 通し数 = 実枚数 + 150
 * ≦ 500 → 8,000円固定
 * > 500（厚物）→ ROUNDUP((面積m² × 40) 円/通し × 通し数, -2)
 * > 500（薄物）→ ROUNDUP((面積m² × 20 + 10) 円/通し × 通し数, -2)
 */
export function calcLaminationCost(
  masters: ProcessingPriceMaster[],
  actualSheets: number,
  widthMm: number,
  heightMm: number,
  productType: ProductType
): number {
  const m = findMaster(masters, 'lamination', productType);
  const passes = actualSheets + 150;

  if (passes <= m.threshold) return m.fixedPrice;

  const unitPrice = roundUp1(
    areaM2(widthMm, heightMm) * (m.coeffA ?? (productType === 'thick' ? 40 : 20)) +
    (m.coeffB ?? (productType === 'thick' ? 0 : 10))
  );
  return roundUp100(passes * unitPrice);
}

// ── 片段合紙（段ボール貼り） ───────────────────────────────

/**
 * 片段合紙費
 *
 * 通し数 = 実枚数 + 150
 * 厚物: ≦ 500 → 10,000円固定, > 500 → 面積m² × 70 円/通し
 * 薄物: ≦ 300 → 10,000円固定, > 300 → 面積m² × 70 円/通し
 */
export function calcCorrugatedCost(
  masters: ProcessingPriceMaster[],
  actualSheets: number,
  widthMm: number,
  heightMm: number,
  productType: ProductType
): number {
  const m = findMaster(masters, 'corrugated', productType);
  const passes = actualSheets + 150;

  if (passes <= m.threshold) return m.fixedPrice;

  const unitPrice = roundUp1(areaM2(widthMm, heightMm) * (m.coeffA ?? 70));
  return roundUp100(passes * unitPrice);
}
