// 証券会社（岡三証券）の取引履歴CSVを解析し、既存資産への反映内容（分配金・購入）を組み立てる。
// 現状は岡三証券フォーマット専用。他社CSVを追加する場合はパーサーを追加して分岐する想定。

export interface OkasanTransaction {
  tradeDate: string; // YYYY-MM-DD
  productType: string; // 投信/外投/株式/現金 など
  name: string;
  transactionType: string; // 現物買付/入金（分配金） など
  currency: string; // 発行通貨（空ならJPY扱い）
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null; // 受渡金額/決済損益
  fee: number | null;
}

// ダブルクォート・カンマを含むCSV1行をパース（RFC4180準拠の簡易実装）
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

// 「約定日,受渡日,商品,銘柄コード,銘柄名,摘要,取引区分,預り区分,発行通貨,数量,単価,受渡金額/決済損益,手数料（税込）,レート,決済通貨」
export function parseOkasanCsv(text: string): OkasanTransaction[] {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((l) => l.startsWith('約定日,受渡日,商品'));
  if (headerIndex === -1) {
    throw new Error('岡三証券の取引履歴CSVとして認識できませんでした（ヘッダー行が見つかりません）');
  }

  const rows: OkasanTransaction[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const cells = parseCsvLine(line);
    if (cells.length < 15) continue;
    const [
      tradeDate,
      ,
      productType,
      ,
      name,
      ,
      transactionType,
      ,
      currency,
      quantity,
      unitPrice,
      amount,
      fee,
    ] = cells;
    if (!name.trim() && productType !== '現金') continue;
    rows.push({
      tradeDate: toIsoDate(tradeDate),
      productType: productType.trim(),
      name: name.trim(),
      transactionType: transactionType.trim(),
      currency: currency.trim() || 'JPY',
      quantity: toNumberOrNull(quantity),
      unitPrice: toNumberOrNull(unitPrice),
      amount: toNumberOrNull(amount),
      fee: toNumberOrNull(fee),
    });
  }
  return rows;
}

export function isBuyTransaction(t: OkasanTransaction): boolean {
  return t.transactionType.includes('買付') || t.transactionType.includes('募集');
}

export function isDistributionTransaction(t: OkasanTransaction): boolean {
  return t.transactionType.includes('分配金') || t.transactionType.includes('配当');
}

// 銘柄名の名寄せ用に、全角英数字を半角化した上で空白・括弧類を除去
// （証券会社ごとに「ＪＰモルガン」「JPモルガン」のように全角/半角表記が揺れるため）
export function normalizeName(name: string): string {
  return name.normalize('NFKC').replace(/[\s()（）【】[\]]/g, '');
}

function commonPrefixLength(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let i = 0;
  while (i < len && a[i] === b[i]) i++;
  return i;
}

export interface MatchableAsset {
  id: number;
  name: string;
  type: string;
}

// CSVの銘柄名と登録済み資産を突き合わせる。
// 岡三証券CSVは銘柄名が長いと末尾が切れる／DB側に証券コード等のサフィックスが付くことがあるため、
// 完全一致がなければ正規化後の最長共通接頭辞で近似マッチする。
export function matchAsset(csvName: string, assets: MatchableAsset[]): MatchableAsset | null {
  const target = normalizeName(csvName);
  if (!target) return null;

  const exact = assets.find((a) => normalizeName(a.name) === target);
  if (exact) return exact;

  let best: MatchableAsset | null = null;
  let bestLen = 0;
  for (const asset of assets) {
    const candidate = normalizeName(asset.name);
    const lcp = commonPrefixLength(target, candidate);
    const threshold = Math.max(8, Math.min(target.length, candidate.length) * 0.6);
    if (lcp >= threshold && lcp > bestLen) {
      bestLen = lcp;
      best = asset;
    }
  }
  return best;
}

export interface DistributionSummary {
  months: number[]; // 1-12、このCSVで分配金が検出された月（重複なし・昇順）
  totalAmount: number; // このCSV期間内の分配金合計（資産のcurrency建て）
  suggestedAnnual: number; // 月平均 × 12 の概算年間見込み額
  currency: string;
}

export interface BuySummary {
  totalQuantity: number;
  totalAmount: number; // 手数料除く（数量×単価の合計）
  weightedUnitPrice: number; // 今回分だけの加重平均単価
  currency: string;
}

export interface ImportGroup {
  csvName: string;
  matched: MatchableAsset | null;
  productType: string;
  distribution: DistributionSummary | null;
  buy: BuySummary | null;
}

export function buildImportGroups(transactions: OkasanTransaction[], assets: MatchableAsset[]): ImportGroup[] {
  const byName = new Map<string, OkasanTransaction[]>();
  for (const t of transactions) {
    if (t.productType === '現金') continue;
    if (!byName.has(t.name)) byName.set(t.name, []);
    byName.get(t.name)!.push(t);
  }

  const groups: ImportGroup[] = [];
  for (const [csvName, txs] of byName) {
    const matched = matchAsset(csvName, assets);
    const productType = txs[0]?.productType ?? '';

    const distTxs = txs.filter(isDistributionTransaction);
    let distribution: DistributionSummary | null = null;
    if (distTxs.length > 0) {
      const months = [...new Set(distTxs.map((t) => Number(t.tradeDate.slice(5, 7))).filter((m) => m >= 1 && m <= 12))].sort(
        (a, b) => a - b
      );
      const totalAmount = distTxs.reduce((sum, t) => sum + (t.amount ?? 0), 0);
      const occurrences = distTxs.length;
      distribution = {
        months,
        totalAmount,
        suggestedAnnual: occurrences > 0 ? Math.round((totalAmount / occurrences) * 12) : 0,
        currency: distTxs[0].currency,
      };
    }

    const buyTxs = txs.filter(isBuyTransaction);
    let buy: BuySummary | null = null;
    if (buyTxs.length > 0) {
      // 投信（productType==='投信'）の単価は「1万口あたり」の基準価額。外投・株式は1口/1株あたりの単価そのもの。
      const unitDivisor = productType === '投信' ? 10000 : 1;
      const totalQuantity = buyTxs.reduce((sum, t) => sum + (t.quantity ?? 0), 0);
      const totalAmount = buyTxs.reduce((sum, t) => sum + ((t.quantity ?? 0) * (t.unitPrice ?? 0)) / unitDivisor, 0);
      buy = {
        totalQuantity,
        totalAmount,
        weightedUnitPrice: totalQuantity > 0 ? (totalAmount * unitDivisor) / totalQuantity : 0,
        currency: buyTxs[0].currency,
      };
    }

    if (!distribution && !buy) continue;
    groups.push({ csvName, matched, productType, distribution, buy });
  }

  return groups;
}
