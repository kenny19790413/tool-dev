import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getStockNews } from '@/lib/stock/news';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id: Number(id) } });
  if (!asset) return NextResponse.json({ error: '資産が見つかりません' }, { status: 404 });

  try {
    const items = await getStockNews(asset.ticker ?? '', asset.name);
    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'ニュースの取得に失敗しました' }, { status: 502 });
  }
}
