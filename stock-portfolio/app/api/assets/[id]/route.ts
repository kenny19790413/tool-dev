import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id: Number(id) },
    include: { valuations: { orderBy: { valuedAt: 'desc' } } },
  });
  if (!asset) return NextResponse.json({ error: '資産が見つかりません' }, { status: 404 });
  return NextResponse.json({ asset });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.quantity !== undefined) data.quantity = body.quantity === '' ? null : Number(body.quantity);
    if (body.avgCost !== undefined)
      data.avgCost = body.avgCost === '' || body.avgCost === null ? null : Number(body.avgCost);
    if (body.annualDistribution !== undefined)
      data.annualDistribution =
        body.annualDistribution === '' || body.annualDistribution === null ? null : Number(body.annualDistribution);
    if (body.note !== undefined) data.note = body.note || null;
    if (body.broker !== undefined) data.broker = body.broker || null;
    if (body.name !== undefined && String(body.name).trim()) data.name = String(body.name).trim();

    const asset = await prisma.asset.update({ where: { id: Number(id) }, data });
    return NextResponse.json({ asset });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.asset.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
