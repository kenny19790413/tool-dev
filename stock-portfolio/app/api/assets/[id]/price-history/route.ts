import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getPriceHistory } from '@/lib/stock/yahoo';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id: Number(id) } });
  if (!asset) return NextResponse.json({ error: '資産が見つかりません' }, { status: 404 });
  if (asset.type !== 'STOCK' || !asset.ticker) {
    return NextResponse.json({ error: 'この資産は価格推移に対応していません' }, { status: 400 });
  }

  const rangeParam = req.nextUrl.searchParams.get('range');
  const range = rangeParam === '1mo' || rangeParam === '1y' ? rangeParam : '6mo';

  try {
    const points = await getPriceHistory(asset.ticker, range);
    return NextResponse.json({ points });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : '価格推移の取得に失敗しました';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
