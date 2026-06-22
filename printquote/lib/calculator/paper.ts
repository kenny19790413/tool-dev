// ============================================================
// PrintQuote 計算エンジン — 用紙費計算
// ============================================================

import { roundUp100 } from './utils';
import type { PaperMaster, ProductType } from './types';

const THIN_DIVISOR  = 1000; // 薄物: 連量(kg) × ㎏単価 × 枚数 ÷ 1000
const THICK_DIVISOR = 100;  // 厚物: 連量(kg) × ㎏単価 × 枚数 ÷ 100

/**
 * 用紙費計算
 *   枚単価あり: 全紙数 × 枚単価
 *   ㎏単価あり: 薄物=連量×㎏単価×全紙数÷1000 / 厚物=÷100
 */
export function calcPaperCost(
  paper: PaperMaster,
  totalSheets: number,
  productType: ProductType
): number {
  if (paper.sheetPrice != null) {
    return roundUp100(paper.sheetPrice * totalSheets);
  }
  if (paper.unitPrice != null) {
    const divisor = productType === 'thin' ? THIN_DIVISOR : THICK_DIVISOR;
    return roundUp100(paper.reamWeight * paper.unitPrice * totalSheets / divisor);
  }
  return 0;
}
