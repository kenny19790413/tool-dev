// 証券会社の「預り資産（預り証券）」= 保有残高CSVを解析する。
// 岡三証券のフォーマットを基準に実装（列構成が同一の他社CSVにもそのまま使える想定）。

import { matchAsset, type MatchableAsset } from './csvImport';

export interface HoldingRow {
  productType: string; // 株式/投信/外投 など
  tickerCode: string;
  name: string;
  quantity: number | null;
  acquisitionCostPerUnit: number | null; // 取得コスト/個別元本（円）
  referencePrice: number | null; // 参考時価
  baseDate: string; // 基準日 YYYY-MM-DD
  acquisitionAmount: number | null; // 取得金額（円）
  evaluationAmountJpy: number | null; // 評価額（円）
  currency: string; // 通貨（外貨建て資産のみ）
  foreignEvaluationAmount: number | null; // 外貨評価額
  settlementDateText: string; // 決算日（例: "毎月/25", "06/15・12/15", "無分配"）
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function toNumberOrNull(s: string | undefined): number | null {
  if (!s || s.trim() === '') return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function toIsoDate(s: string | undefined): string {
  const m = (s ?? '').match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (!m) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

const HOLDINGS_HEADER_PREFIX = '商品,銘柄コード,銘柄名,市場,預り区分,保有数量';

export function isHoldingsCsv(text: string): boolean {
  return text.split(/\r?\n/).some((l) => l.startsWith(HOLDINGS_HEADER_PREFIX));
}

// 商品,銘柄コード,銘柄名,市場,預り区分,保有数量,注文中数量,売却可能数量,取得コスト/個別元本（円）,参考時価,
// 基準日,現在値,前日比,取得金額（円）,評価額（円）,評価損益（円）,評価レート,通貨,外貨評価額,利率,利払日,決算日,償還日
export function parseOkasanHoldingsCsv(text: string): HoldingRow[] {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((l) => l.startsWith(HOLDINGS_HEADER_PREFIX));
  if (headerIndex === -1) {
    throw new Error('保有残高CSVとして認識できませんでした（ヘッダー行が見つかりません）');
  }

  const rows: HoldingRow[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const c = parseCsvLine(line);
    if (c.length < 20) continue;
    const [
      productType,
      tickerCode,
      name,
      ,
      ,
      quantity,
      ,
      ,
      acquisitionCostPerUnit,
      referencePrice,
      baseDate,
      ,
      ,
      acquisitionAmount,
      evaluationAmountJpy,
      ,
      ,
      currency,
      foreignEvaluationAmount,
      ,
      ,
      settlementDateText,
    ] = c;
    if (!name.trim()) continue;
    rows.push({
      productType: productType.trim(),
      tickerCode: tickerCode.trim(),
      name: name.trim(),
      quantity: toNumberOrNull(quantity),
      acquisitionCostPerUnit: toNumberOrNull(acquisitionCostPerUnit),
      referencePrice: toNumberOrNull(referencePrice),
      baseDate: toIsoDate(baseDate),
      acquisitionAmount: toNumberOrNull(acquisitionAmount),
      evaluationAmountJpy: toNumberOrNull(evaluationAmountJpy),
      currency: currency.trim() || 'JPY',
      foreignEvaluationAmount: toNumberOrNull(foreignEvaluationAmount),
      settlementDateText: (settlementDateText ?? '').trim(),
    });
  }
  return rows;
}

export interface SettlementInfo {
  months: number[]; // 決算日から読み取れた月（1-12、重複なし昇順）
  noDistribution: boolean; // 「無分配」明記
}

// 「毎月/25」「06/15・12/15」「10/21」「無分配」等の決算日表記から分配月を推定する
export function parseSettlementDate(text: string): SettlementInfo {
  if (!text || text.trim() === '') return { months: [], noDistribution: false };
  if (text.includes('無分配')) return { months: [], noDistribution: true };
  if (text.includes('毎月')) return { months: Array.from({ length: 12 }, (_, i) => i + 1), noDistribution: false };

  const months = new Set<number>();
  for (const m of text.matchAll(/(\d{1,2})\/\d{1,2}/g)) {
    const month = Number(m[1]);
    if (month >= 1 && month <= 12) months.add(month);
  }
  return { months: [...months].sort((a, b) => a - b), noDistribution: false };
}

export interface HoldingImportItem {
  csvName: string;
  productType: string;
  row: HoldingRow;
  matched: MatchableAsset | null;
  settlement: SettlementInfo;
  // PRIVATE想定: 評価額（資産のcurrency建て）を新規Valuationとして登録する提案値
  suggestedValuation: number | null;
}

export function buildHoldingsImportItems(rows: HoldingRow[], assets: MatchableAsset[]): HoldingImportItem[] {
  const items: HoldingImportItem[] = [];
  for (const row of rows) {
    const matched = matchAsset(row.name, assets);
    const settlement = parseSettlementDate(row.settlementDateText);
    const suggestedValuation =
      row.currency !== 'JPY' && row.foreignEvaluationAmount !== null
        ? row.foreignEvaluationAmount
        : row.evaluationAmountJpy;
    items.push({
      csvName: row.name,
      productType: row.productType,
      row,
      matched,
      settlement,
      suggestedValuation,
    });
  }
  return items;
}
