// 投資信託の基準価額を運用会社の公式ファンドページから取得する。
// 投資信託協会の「投信総合検索ライブラリー」は利用規約で自動取得を禁止しているため使用しない。
// 運用会社ごとにページ構造が異なり汎用APIが無いため、ユーザーが貼り付けた公式ページURLの
// HTMLから「基準価額」という文言の近くにある金額を正規表現で抽出するベストエフォート実装。
// 対応していないページ形式の場合はエラーを投げ、手動登録（プライベート資産）へのフォールバックを促す。

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');

  const nav = extractNav(text);
  if (nav === null) {
    throw new Error(
      'このページから基準価額を自動取得できませんでした。運用会社のページ形式に対応していない可能性があります。「プライベート資産」区分で手動登録することもできます。'
    );
  }

  return { name: extractName(html), nav, navDate: extractDate(text) };
}

function extractNav(text: string): number | null {
  const m = text.match(/基準価額[^0-9]{0,20}([0-9][0-9,]{2,})\s*円/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractName(html: string): string | null {
  const m = html.match(/<title>([^<]+)<\/title>/);
  if (!m) return null;
  return m[1].trim().replace(/\s*[|｜].*$/, '');
}

function extractDate(text: string): string | null {
  const m = text.match(/基準日[^0-9]{0,10}(\d{4}[\/年]\d{1,2}[\/月]\d{1,2}日?)/);
  return m ? m[1] : null;
}
