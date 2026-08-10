import { NextRequest, NextResponse } from 'next/server';
import { fetchFundNav } from '@/lib/stock/fundNav';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') ?? '';
  if (!url.trim()) {
    return NextResponse.json({ error: 'URLを入力してください' }, { status: 400 });
  }

  try {
    const info = await fetchFundNav(url);
    return NextResponse.json(info);
  } catch (e) {
    const message = e instanceof Error ? e.message : '取得に失敗しました';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
