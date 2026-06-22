// ============================================================
// PrintQuote 計算エンジン — 基本値計算
// 実枚数・ヤレ枚数・全紙数・通し数
// ============================================================

import { ceilTo } from './utils';
import type { CalcInput, CalcIntermediate } from './types';

const SHEET_UNIT = 50; // 全紙数切り上げ単位（枚）
const THOMSON_EXTRA_WASTE = 100; // トムソンありの追加ヤレ枚数

export function calcIntermediate(input: CalcInput): CalcIntermediate {
  const { quantity, faces, cuts, wasteRate, hasThomson } = input;

  // 実枚数（親判）= 受注数 ÷ 丁付け数、端数切り上げ
  const actualSheets = Math.ceil(quantity / faces);

  // ヤレ枚数 = 実枚数 × ヤレ率(%) + トムソン追加分
  const wasteSheets =
    Math.ceil(actualSheets * wasteRate / 100) +
    (hasThomson ? THOMSON_EXTRA_WASTE : 0);

  // 全紙数（発注枚数）= 50枚単位切り上げ
  const totalSheets = ceilTo(actualSheets + wasteSheets, SHEET_UNIT);

  // 通し数 = 受注数 ÷ 丁付け数 ÷ 切数（印刷機通し回数）
  const passes = quantity / faces / cuts;

  return { actualSheets, wasteSheets, totalSheets, passes };
}
