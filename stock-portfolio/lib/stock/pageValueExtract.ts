// 運用会社・発行体が公開しているページのHTMLから、金額をベストエフォートで抽出する共通ロジック。
// fundNav.ts（投資信託の基準価額）とvaluationPage.ts（債券・プライベート資産の評価額）で共用する。
//
// ページ構成には主に2パターンある:
//   1) インライン形式: 「基準価額：12,345円」のように、キーワード直後に金額と単位が続く
//   2) 表形式: 「基準価額（円） 前日比（円） 純資産総額（百万円） 12,345 ＋9 78,457」のように、
//      見出し行の後にデータ行が続き、金額に単位が付かない
// また「基準日：2026年08月20日」のような日付表記に含まれる数字を誤って金額として拾わないよう、
// 数字の直後が年・月・日・期であれば除外する。

const NUM_TOKEN = /(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{4,}(?:\.\d+)?)/g;
const DATE_SUFFIX = /^\s*[年月日期]/;
const SEARCH_WINDOW = 300; // キーワード以降、何文字以内を探索するか

export interface AmountMatch {
  keyword: string;
  value: number;
  viaHeader: boolean; // 「キーワード（円）」の表形式見出しにマッチしたか
}

export function htmlToFlatText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&yen;/g, '円')
    .replace(/\s+/g, ' ');
}

// テキスト中からkeywordsを順に試し、最初に見つかった妥当な金額を返す。
export function extractAmountNearKeywords(text: string, keywords: string[]): AmountMatch | null {
  for (const keyword of keywords) {
    const match = extractAmountForKeyword(text, keyword);
    if (match) return match;
  }
  return null;
}

function extractAmountForKeyword(text: string, keyword: string): AmountMatch | null {
  // 表形式の見出し「キーワード（円）」を優先的に探す（値そのものには単位が付かないケースに対応）
  const headerIdx = text.indexOf(`${keyword}（円）`);
  const startIdx = headerIdx !== -1 ? headerIdx + keyword.length + 3 : text.indexOf(keyword);
  if (startIdx === -1) return null;

  const windowText = text.slice(startIdx, startIdx + SEARCH_WINDOW);
  NUM_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUM_TOKEN.exec(windowText))) {
    const after = windowText.slice(m.index + m[0].length, m.index + m[0].length + 2);
    if (DATE_SUFFIX.test(after)) continue; // 日付の一部（2026年 等）は除外
    const value = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0) continue;
    return { keyword, value, viaHeader: headerIdx !== -1 };
  }
  return null;
}

export function extractPageTitle(html: string): string | null {
  const m = html.match(/<title>([^<]+)<\/title>/);
  if (!m) return null;
  return m[1].trim().replace(/\s*[|｜].*$/, '');
}

export function extractDateNearKeywords(text: string, keywords: string[]): string | null {
  for (const keyword of keywords) {
    const re = new RegExp(`${keyword}[^0-9]{0,10}(\\d{4}[/年]\\d{1,2}[/月]\\d{1,2}日?)`);
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}
