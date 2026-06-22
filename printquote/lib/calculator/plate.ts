// ============================================================
// PrintQuote 計算エンジン — 刷版費計算
// ============================================================

import type { CoaterType } from './types';

const COATER_DEDUCT: Record<CoaterType, number> = {
  none: 0,
  single: 1,
  double: 2,
};

/**
 * 刷版費計算
 *
 * 版数 = 表度数 + 裏度数 - コーター数
 * 版単価 = IF(表度数+裏度数 >= 4, 1800 + 200 × 丁付け数, 2300 + 200 × 丁付け数)
 * 刷版費 = 版数 × 版単価
 *
 * @param frontColors 表度数
 * @param backColors  裏度数
 * @param coater      コーター有無
 * @param faces       丁付け数
 */
export function calcPlateCost(
  frontColors: number,
  backColors: number,
  coater: CoaterType,
  faces: number
): number {
  const totalColors = frontColors + backColors;
  const plateCount = totalColors - COATER_DEDUCT[coater];

  // 4色以上は高速版、3色以下は特色版（単価が高い）
  const plateUnitPrice =
    totalColors >= 4
      ? 1800 + 200 * faces
      : 2300 + 200 * faces;

  return plateCount * plateUnitPrice;
}
