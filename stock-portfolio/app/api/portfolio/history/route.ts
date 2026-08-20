import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

const RANGE_DAYS: Record<string, number> = { '1mo': 30, '6mo': 182, '1y': 365 };

export async function GET(req: NextRequest) {
  const rangeParam = req.nextUrl.searchParams.get('range');
  const days = RANGE_DAYS[rangeParam ?? ''] ?? RANGE_DAYS['6mo'];

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - days);

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'asc' },
  });

  const points = snapshots.map((s) => ({
    date: s.date.toISOString().slice(0, 10),
    totalValueJpy: Number(s.totalValueJpy),
    totalGainJpy: s.totalGainJpy === null ? null : Number(s.totalGainJpy),
  }));
  return NextResponse.json({ points });
}
