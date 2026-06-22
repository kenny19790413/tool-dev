// ============================================================
// PrintQuote 計算エンジン — 丁付け自動計算
// ============================================================

import { ceilTo, roundUp100 } from './utils';
import type { PaperMaster, ImpositionCandidate } from './types';
import { calcPaperCost } from './paper';

const SHEET_UNIT = 50;

interface ImpositionInput {
  finishWidthMm: number;
  finishHeightMm: number;
  quantity: number;
  wasteRate: number;
  hasThomson: boolean;
  papers: PaperMaster[];
}

/**
 * 1枚の親判から何丁取れるか計算（縦横2パターン）
 */
function calcFaces(
  paperW: number,
  paperH: number,
  finishW: number,
  finishH: number
): { facesH: number; facesV: number; rotated: boolean }[] {
  const patterns: { facesH: number; facesV: number; rotated: boolean }[] = [];

  // 正向き
  const fH = Math.floor(paperW / finishW);
  const fV = Math.floor(paperH / finishH);
  if (fH > 0 && fV > 0) patterns.push({ facesH: fH, facesV: fV, rotated: false });

  // 90度回転
  const fH2 = Math.floor(paperW / finishH);
  const fV2 = Math.floor(paperH / finishW);
  if (
    fH2 > 0 &&
    fV2 > 0 &&
    (fH2 !== fH || fV2 !== fV) // 同じ結果は除外
  ) {
    patterns.push({ facesH: fH2, facesV: fV2, rotated: true });
  }

  return patterns;
}

/**
 * 丁付け候補を全用紙 × 全パターンで列挙し、
 * コスト / 効率 / 標準 の3パターンを返す
 */
export function calcImpositionSuggestions(
  input: ImpositionInput
): ImpositionCandidate[] {
  const { finishWidthMm, finishHeightMm, quantity, wasteRate, hasThomson, papers } = input;

  const candidates: (ImpositionCandidate & { _score: number })[] = [];

  for (const paper of papers) {
    const patterns = calcFaces(paper.widthMm, paper.heightMm, finishWidthMm, finishHeightMm);

    for (const { facesH, facesV, rotated } of patterns) {
      const totalFaces = facesH * facesV;
      const actualSheets = Math.ceil(quantity / totalFaces);
      const wasteSheets =
        Math.ceil(actualSheets * wasteRate / 100) + (hasThomson ? 100 : 0);
      const totalSheets = ceilTo(actualSheets + wasteSheets, SHEET_UNIT);
      const paperCost = calcPaperCost(paper, totalSheets);

      candidates.push({
        paperId: paper.id,
        paperName: paper.name,
        parentSize: paper.parentSize,
        facesH,
        facesV,
        totalFaces,
        rotated,
        actualSheets,
        totalSheets,
        paperCost,
        patternLabel: 'cost', // 後で上書き
        _score: paperCost,    // ソート用
      });
    }
  }

  if (candidates.length === 0) return [];

  // コスト昇順ソート
  candidates.sort((a, b) => a._score - b._score);

  const result: ImpositionCandidate[] = [];

  // コスト最小パターン
  const costBest = { ...candidates[0], patternLabel: 'cost' as const };
  delete (costBest as { _score?: number })._score;
  result.push(costBest);

  // 効率最大パターン（丁数最大 = 歩留まり最高）
  const effBest = [...candidates].sort((a, b) => b.totalFaces - a.totalFaces)[0];
  if (effBest && effBest !== candidates[0]) {
    const eff = { ...effBest, patternLabel: 'efficient' as const };
    delete (eff as { _score?: number })._score;
    result.push(eff);
  }

  // 標準パターン（コストと効率の中間: 丁数の中央値）
  const mid = candidates[Math.floor(candidates.length / 2)];
  if (mid && mid !== candidates[0] && mid !== effBest) {
    const std = { ...mid, patternLabel: 'standard' as const };
    delete (std as { _score?: number })._score;
    result.push(std);
  }

  return result;
}
