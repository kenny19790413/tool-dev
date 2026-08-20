import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const receipts = await prisma.distributionReceipt.findMany({
    where: { assetId: Number(id) },
    orderBy: { receivedAt: 'desc' },
  });
  return NextResponse.json({ receipts });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: '受取額を正しく入力してください' }, { status: 400 });
    }
    const receivedAt = body.receivedAt ? new Date(body.receivedAt) : new Date();
    if (Number.isNaN(receivedAt.getTime())) {
      return NextResponse.json({ error: '受取日を正しく入力してください' }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({ where: { id: Number(id) } });
    if (!asset) return NextResponse.json({ error: '資産が見つかりません' }, { status: 404 });

    const receipt = await prisma.distributionReceipt.create({
      data: { assetId: asset.id, amount, receivedAt, note: body.note || null },
    });
    return NextResponse.json({ receipt });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
  }
}
