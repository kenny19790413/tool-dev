// 市況ニュース（銘柄を跨いだ相場全体のニュース）。
// Investing.com Japanがサイト側で公式に配信している「株式市場ニュース」RSSフィードを利用する
// （個別銘柄スクレイピングとは異なり、サイトがRSSリーダー等での購読を想定して公開している導線）。
// 見出し・発行元・公開日・リンクのみを扱い、本文は取得・保存・表示しない。

import type { NewsItem } from './news';

const FEED_URL = 'https://jp.investing.com/rss/news_25.rss';

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function toIso(pubDate: string): string {
  // "2026-08-20 02:45:10" -> "2026-08-20T02:45:10+09:00"（JST想定）
  const m = pubDate.match(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
  if (!m) return new Date().toISOString();
  return `${m[1]}T${m[2]}+09:00`;
}

export async function getMarketNews(): Promise<NewsItem[]> {
  const res = await fetch(FEED_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`市況ニュースの取得に失敗しました (HTTP ${res.status})`);

  const xml = await res.text();
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  const items: NewsItem[] = [];
  for (const block of blocks.slice(0, 15)) {
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
    if (!title || !link) continue;
    items.push({
      title: decodeXmlEntities(title),
      url: link,
      source: 'Investing.com',
      publishedAt: pubDate ? toIso(pubDate) : new Date().toISOString(),
    });
  }
  return items;
}
