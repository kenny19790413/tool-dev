import { NextResponse } from 'next/server';
import { getMarketNews } from '@/lib/stock/marketNews';

export async function GET() {
  try {
    const items = await getMarketNews();
    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '市況ニュースの取得に失敗しました' }, { status: 502 });
  }
}
