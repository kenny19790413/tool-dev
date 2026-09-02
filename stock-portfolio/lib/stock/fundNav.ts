// 投資信託の基準価額を運用会社の公式ファンドページから取得する。
// 投資信託協会の「投信総合検索ライブラリー」は利用規約で自動取得を禁止しているため使用しない。
// 運用会社ごとにページ構造が異なり汎用APIが無いため、ユーザーが貼り付けた公式ページURLの
// HTMLから「基準価額」という文言の近くにある金額をベストエフォートで抽出する（詳細はpageValueExtract.ts）。
// 対応していないページ形式の場合はエラーを投げ、手動登録（プライベート資産）へのフォールバックを促す。
import { htmlToFlatText, extractAmountNearKeywords, extractPageTitle, extractDateNearKeywords } from './pageValueExtract';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const NAV_KEYWORDS = ['基準価額'];
const DATE_KEYWORDS = ['基準日'];

export interface FundNavInfo {
  name: string | null;
  nav: number; // 基準価額（円、1万口あたり）
  navDate: string | null;
}

export async function fetchFundNav(url: string): Promise<FundNavInfo> {
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

  const match = extractAmountNearKeywords(text, NAV_KEYWORDS);
  if (!match) {
    throw new Error(
      'このページから基準価額を自動取得できませんでした。運用会社のページ形式に対応していない可能性があります。「プライベート資産」区分で手動登録することもできます。'
    );
  }

  return { name: extractPageTitle(html), nav: match.value, navDate: extractDateNearKeywords(text, DATE_KEYWORDS) };
}
