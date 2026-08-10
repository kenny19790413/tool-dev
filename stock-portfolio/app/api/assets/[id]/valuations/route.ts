import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    const value = Number(body.value);
    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json({ error: '評価額を正しく入力してください' }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({ where: { id: Number(id) } });
    if (!asset) return NextResponse.json({ error: '資産が見つかりません' }, { status: 404 });
    if (asset.type === 'STOCK' || asset.type === 'FUND') {
      return NextResponse.json({ error: 'この資産は「価格を更新」機能を使用してください' }, { status: 400 });
    }

    const valuation = await prisma.valuation.create({
      data: { assetId: asset.id, value, note: body.note || null },
    });
    return NextResponse.json({ valuation });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
  }
}
