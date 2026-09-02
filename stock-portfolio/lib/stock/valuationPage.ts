// 債券・プライベート資産の評価額を、運用会社・発行体が公開しているページから取得する。
// 投資信託の基準価額（fundNav.ts）と同じ抽出ロジックを使うが、ページごとに使われる用語が
// 「評価額」「時価」「参考価格」等とばらつくため、複数のキーワードを順に試すベストエフォート実装。
// ログインが必要なページ（証券会社のマイページ等）は取得できない（ログイン画面が返るため失敗する）。
import { htmlToFlatText, extractAmountNearKeywords, extractPageTitle, extractDateNearKeywords } from './pageValueExtract';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const VALUE_KEYWORDS = ['評価額', '時価評価額', '時価', '参考価格', '基準価額', '基準価格'];
const DATE_KEYWORDS = ['基準日', '評価日', '算出日', '価格日', '報告日'];

export interface PublicPageValuation {
  name: string | null;
  value: number;
  asOfDate: string | null;
  matchedKeyword: string;
}

export async function fetchPublicPageValuation(url: string): Promise<PublicPageValuation> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('URLの形式が正しくありません');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('https:// で始まるURLを指定してください');
  }

  const res = await fetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`ページの取得に失敗しました (HTTP ${res.status})`);
  }
  const html = await res.text();
  const text = htmlToFlatText(html);

  const match = extractAmountNearKeywords(text, VALUE_KEYWORDS);
  if (!match) {
    throw new Error(
      'このページから評価額を自動取得できませんでした。ログインが必要なページの可能性があるほか、ページの表記形式に対応していない可能性があります。内容を確認のうえ手動で入力してください。'
    );
  }

  return {
    name: extractPageTitle(html),
    value: match.value,
    asOfDate: extractDateNearKeywords(text, DATE_KEYWORDS),
    matchedKeyword: match.keyword,
  };
}
