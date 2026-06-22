// ============================================================
// PrintQuote 計算エンジン — 共通ユーティリティ
// ============================================================

/** 100円単位切り上げ（合計・用紙費・各加工費に使用） */
export const roundUp100 = (value: number): number =>
  Math.ceil(value / 100) * 100;

/** 小数第1位切り上げ（通し単価の面積係数計算に使用） */
export const roundUp1 = (value: number): number =>
  Math.ceil(value * 10) / 10;

/** N単位切り上げ */
export const ceilTo = (value: number, unit: number): number =>
  Math.ceil(value / unit) * unit;

/** 面積(m²) = 幅mm × 高さmm ÷ 1,000,000 */
export const areaM2 = (widthMm: number, heightMm: number): number =>
  (widthMm * heightMm) / 1_000_000;
