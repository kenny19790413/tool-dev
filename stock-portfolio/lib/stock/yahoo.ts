// Yahoo Finance 非公式APIラッパー
// 銘柄検索・現在値・配当・為替レートの取得に使用する。
// 公式APIではないため、Yahoo側の仕様変更で動かなくなる可能性がある。
// その場合でも資産登録・評価額の手動更新は常に可能（フォールバック）。

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const BASE_HEADERS: Record<string, string> = {
  'User-Agent': UA,
  Accept: 'application/json,text/plain,*/*',
};

interface Session {
  cookie: string;
  crumb: string;
  expiresAt: number;
}

let session: Session | null = null;

// 検索・quoteSummaryにはcookie+crumbが必要（Yahoo側の制限）。chart APIは不要なことが多い。
async function ensureSession(): Promise<Session> {
  const now = Date.now();
  if (session && now < session.expiresAt) return session;

  const cookieRes = await fetch('https://fc.yahoo.com', {
    headers: BASE_HEADERS,
    redirect: 'manual',
  });
  const setCookies =
    typeof cookieRes.headers.getSetCookie === 'function'
      ? cookieRes.headers.getSetCookie()
      : [cookieRes.headers.get('set-cookie') ?? ''].filter(Boolean);
  const cookie = setCookies.map((c) => c.split(';')[0]).join('; ');

  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { ...BASE_HEADERS, Cookie: cookie },
  });
  const crumb = (await crumbRes.text()).trim();

  session = { cookie, crumb, expiresAt: now + 25 * 60 * 1000 };
  return session;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const { cookie, crumb } = await ensureSession();
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    q
  )}&quotesCount=10&newsCount=0&lang=ja-JP&region=JP&crumb=${encodeURIComponent(crumb)}`;

  const res = await fetch(url, { headers: { ...BASE_HEADERS, Cookie: cookie }, cache: 'no-store' });
  if (!res.ok) throw new Error(`銘柄検索に失敗しました (HTTP ${res.status})`);
  const data = await res.json();
  const quotes = Array.isArray(data?.quotes) ? data.quotes : [];

  return quotes
    .filter((item: Record<string, unknown>) => typeof item.symbol === 'string')
    .map((item: Record<string, unknown>) => ({
      symbol: String(item.symbol),
      name: String(item.shortname ?? item.longname ?? item.symbol),
      exchange: String(item.exchange ?? ''),
      type: String(item.quoteType ?? ''),
    }));
}

export interface QuoteInfo {
  symbol: string;
  price: number;
  currency: string;
  name: string | null;
}

// 現在値取得（chart APIはcrumb不要な場合が多く、検索より安定して動く）
export async function getQuote(symbol: string): Promise<QuoteInfo> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: BASE_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`現在値の取得に失敗しました: ${symbol} (HTTP ${res.status})`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (typeof price !== 'number') throw new Error(`現在値が取得できませんでした: ${symbol}`);

  return {
    symbol,
    price,
    currency: typeof meta?.currency === 'string' ? meta.currency : 'JPY',
    name: typeof meta?.longName === 'string' ? meta.longName : (meta?.shortName ?? null),
  };
}

// 年間配当/株（TTM概算）。取得できない場合はnullを返す（配当なし銘柄・API制限時など）。
export async function getDividendPerShare(symbol: string): Promise<number | null> {
  try {
    const { cookie, crumb } = await ensureSession();
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
      symbol
    )}?modules=summaryDetail&crumb=${encodeURIComponent(crumb)}`;
    const res = await fetch(url, { headers: { ...BASE_HEADERS, Cookie: cookie }, cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.quoteSummary?.result?.[0]?.summaryDetail?.trailingAnnualDividendRate?.raw;
    return typeof raw === 'number' ? raw : null;
  } catch {
    return null;
  }
}

// 配当・分配金が支払われる月（過去1年の配当履歴から推定、権利落ち日ベース）。
// 実際の入金はこの月より後になることがある（特に日本株は権利確定から1〜3ヶ月程度）。
// 取得できない場合は空配列を返す（配当なし銘柄・API制限時など）。
export async function getDividendMonths(symbol: string): Promise<number[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=1d&range=1y&events=div`;
    const res = await fetch(url, { headers: BASE_HEADERS, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const dividends = data?.chart?.result?.[0]?.events?.dividends;
    if (!dividends || typeof dividends !== 'object') return [];

    const months = new Set<number>();
    for (const entry of Object.values(dividends) as { date?: number }[]) {
      if (typeof entry?.date !== 'number') continue;
      months.add(new Date(entry.date * 1000).getUTCMonth() + 1);
    }
    return Array.from(months).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export interface AnalystTarget {
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  recommendationKey: string | null;
  numberOfAnalystOpinions: number | null;
}

// アナリスト目標株価（Yahoo Financeが集計する実際のアナリスト予想。AIによる推測ではない）。
// 取得できない場合は全項目nullを返す（アナリストカバレッジがない銘柄など）。
export async function getAnalystTarget(symbol: string): Promise<AnalystTarget> {
  const empty: AnalystTarget = {
    targetMeanPrice: null,
    targetHighPrice: null,
    targetLowPrice: null,
    recommendationKey: null,
    numberOfAnalystOpinions: null,
  };
  try {
    const { cookie, crumb } = await ensureSession();
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
      symbol
    )}?modules=financialData&crumb=${encodeURIComponent(crumb)}`;
    const res = await fetch(url, { headers: { ...BASE_HEADERS, Cookie: cookie }, cache: 'no-store' });
    if (!res.ok) return empty;
    const data = await res.json();
    const fd = data?.quoteSummary?.result?.[0]?.financialData;
    if (!fd) return empty;
    return {
      targetMeanPrice: typeof fd.targetMeanPrice?.raw === 'number' ? fd.targetMeanPrice.raw : null,
      targetHighPrice: typeof fd.targetHighPrice?.raw === 'number' ? fd.targetHighPrice.raw : null,
      targetLowPrice: typeof fd.targetLowPrice?.raw === 'number' ? fd.targetLowPrice.raw : null,
      recommendationKey: typeof fd.recommendationKey === 'string' ? fd.recommendationKey : null,
      numberOfAnalystOpinions:
        typeof fd.numberOfAnalystOpinions?.raw === 'number' ? fd.numberOfAnalystOpinions.raw : null,
    };
  } catch {
    return empty;
  }
}

// Yahoo Financeシンボルから市場を推定（日本株は ".T" サフィックス）
export function inferMarket(symbol: string): 'JP' | 'US' {
  return symbol.trim().toUpperCase().endsWith('.T') ? 'JP' : 'US';
}

// USD/JPY為替レート取得
export async function getUsdJpyRate(): Promise<number> {
  const quote = await getQuote('JPY=X');
  return quote.price;
}
