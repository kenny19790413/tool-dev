// 銘柄ごとのニュース見出し取得。
// 東証の適時開示情報（TDnet）を、個人運営の非公式ミラーAPI「やのしんTDnet WEB-API」
// （https://webapi.yanoshin.jp/tdnet/）経由で取得する。決算短信・配当・業績修正等の
// 開示インデックス（表題+PDFリンク）のみを扱い、本文は取得・保存・表示しない。
// 東証上場の日本株（ticker末尾が".T"）のみ対象。米国株等は対象外。

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO date
}

interface TdnetItem {
  Tdnet: {
    pubdate: string; // "2026-08-06 13:30:00" (JST)
    company_name: string;
    title: string;
    document_url: string;
  };
}

function toIsoJst(pubdate: string): string {
  // "2026-08-06 13:30:00" -> "2026-08-06T13:30:00+09:00"
  return pubdate.replace(' ', 'T') + '+09:00';
}

export async function getStockNews(ticker: string, _name: string): Promise<NewsItem[]> {
  if (!ticker.endsWith('.T')) return []; // 東証上場銘柄のみ対応
  const code = ticker.slice(0, -2);
  if (!/^\d{4}$/.test(code)) return [];

  const res = await fetch(`https://webapi.yanoshin.jp/webapi/tdnet/list/${code}.json?limit=10`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`TDnet開示情報の取得に失敗しました (HTTP ${res.status})`);

  const data = (await res.json()) as { items?: TdnetItem[] };
  return (data.items ?? []).map((item) => ({
    title: item.Tdnet.title,
    url: item.Tdnet.document_url,
    source: '適時開示（TDnet）',
    publishedAt: toIsoJst(item.Tdnet.pubdate),
  }));
}
