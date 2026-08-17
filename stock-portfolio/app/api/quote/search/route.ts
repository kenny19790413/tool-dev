import { NextRequest, NextResponse } from 'next/server';
import { searchSymbols, inferMarket } from '@/lib/stock/yahoo';

// Yahoo Financeの検索APIは全角(日本語)クエリを受け付けない（400を返す）ため、
// 事前に弾いて分かりやすいエラーメッセージを返す。
const NON_ASCII = /[^\x00-\x7F]/;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json({ results: [] });

  if (NON_ASCII.test(q)) {
    return NextResponse.json(
      { error: '日本語での検索には対応していません。銘柄コード(例: 7203)またはローマ字・英語社名(例: Toyota, Apple)で検索してください。' },
      { status: 400 }
    );
  }

  try {
    const results = await searchSymbols(q);
    const mapped = results.map((r) => ({ ...r, market: inferMarket(r.symbol) }));
    // 銘柄コード（数字のみ）での検索は、日本の証券コードを想定して日本株(.T)を優先表示する
    if (/^\d+$/.test(q.trim())) {
      mapped.sort((a, b) => Number(!a.symbol.endsWith('.T')) - Number(!b.symbol.endsWith('.T')));
    }
    return NextResponse.json({ results: mapped });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: '銘柄検索に失敗しました。時間をおいて再試行するか、銘柄コードを直接入力してください。' },
      { status: 502 }
    );
  }
}
