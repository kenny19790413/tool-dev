// ============================================================
// PrintQuote 計算エンジン — 印刷費・インク費計算
// ============================================================

import { roundUp100, areaM2 } from './utils';
import type { PrintPriceMaster, ColorType } from './types';

/**
 * 枚数帯に合った印刷単価マスタを取得
 */
function findPrintPrice(
  masters: PrintPriceMaster[],
  colorType: ColorType,
  passes: number
): number {
  const matched = masters.find(
    (m) =>
      m.colorType === colorType &&
      passes >= m.minSheets &&
      (m.maxSheets === null || passes < m.maxSheets)
  );
  if (!matched) throw new Error(`印刷単価マスタが見つかりません: colorType=${colorType}, passes=${passes}`);
  return matched.unitPrice;
}

/**
 * 印刷費
 *
 * 通し単価（1色）= 枚数帯テーブルから取得
 * 印刷費 = ROUNDUP(通し単価 × 通し数 × 総色数, -2)
 *
 * @param masters     印刷単価マスタ一覧
 * @param colorType   プロセス / 特色
 * @param frontColors 表度数
 * @param backColors  裏度数
 * @param passes      通し数（quantity / faces / cuts）
 */
export function calcPrintCost(
  masters: PrintPriceMaster[],
  colorType: ColorType,
  frontColors: number,
  backColors: number,
  passes: number
): number {
  const unitPrice = findPrintPrice(masters, colorType, passes);
  const totalColors = frontColors + backColors;
  return roundUp100(unitPrice * passes * totalColors);
}

/**
 * インク費
 *
 * インク単価（円/通し） = 幅mm × 高さmm × 4 / 1,000,000
 * インク費 = ROUNDUP(通し数 × インク単価, -2)
 *
 * @param widthMm  用紙幅（mm）
 * @param heightMm 用紙高さ（mm）
 * @param passes   通し数
 */
export function calcInkCost(
  widthMm: number,
  heightMm: number,
  passes: number
): number {
  const inkUnitPrice = areaM2(widthMm, heightMm) * 4;
  return roundUp100(passes * inkUnitPrice);
}
