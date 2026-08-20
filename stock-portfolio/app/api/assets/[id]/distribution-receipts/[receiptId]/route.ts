import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

interface Params {
  params: Promise<{ id: string; receiptId: string }>;
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, receiptId } = await params;
  try {
    const receipt = await prisma.distributionReceipt.findUnique({ where: { id: Number(receiptId) } });
    if (!receipt || receipt.assetId !== Number(id)) {
      return NextResponse.json({ error: '記録が見つかりません' }, { status: 404 });
    }
    await prisma.distributionReceipt.delete({ where: { id: Number(receiptId) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
