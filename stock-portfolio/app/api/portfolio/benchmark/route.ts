import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getPriceHistory } from '@/lib/stock/yahoo';

const RANGE_DAYS: Record<string, number> = { '1mo': 30, '6mo': 182, '1y': 365 };

// 直近以前で最も近い日付の値を返す（指数の取引日とスナップショット記録日がズレる場合のフォールバック）
function findNearestValue(map: Map<string, number>, targetDate: string): number | null {
  if (map.has(targetDate)) return map.get(targetDate)!;
  let candidate: string | null = null;
  for (const d of [...map.keys()].sort()) {
    if (d <= targetDate) candidate = d;
    else break;
  }
  return candidate !== null ? (map.get(candidate) ?? null) : null;
}

export async function GET(req: NextRequest) {
  const rangeParam = req.nextUrl.searchParams.get('range');
  const range = rangeParam === '1mo' || rangeParam === '1y' ? rangeParam : '6mo';
  const days = RANGE_DAYS[range];

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - days);

  const [snapshots, nikkei, topixEtf] = await Promise.all([
    prisma.portfolioSnapshot.findMany({ where: { date: { gte: since } }, orderBy: { date: 'asc' } }),
    getPriceHistory('^N225', range).catch(() => []),
    getPriceHistory('1306.T', range).catch(() => []),
  ]);

  if (snapshots.length < 2) {
    return NextResponse.json({ points: [] });
  }

  const nikkeiByDate = new Map(nikkei.map((p) => [p.date, p.close]));
  const topixByDate = new Map(topixEtf.map((p) => [p.date, p.close]));

  const baseDate = snapshots[0].date.toISOString().slice(0, 10);
  const baseValue = Number(snapshots[0].totalValueJpy);
  const baseNikkei = findNearestValue(nikkeiByDate, baseDate);
  const baseTopix = findNearestValue(topixByDate, baseDate);

  const points = snapshots.map((s) => {
    const date = s.date.toISOString().slice(0, 10);
    const nikkeiValue = findNearestValue(nikkeiByDate, date);
    const topixValue = findNearestValue(topixByDate, date);
    return {
      date,
      portfolioIndex: baseValue > 0 ? (Number(s.totalValueJpy) / baseValue) * 100 : null,
      nikkeiIndex: baseNikkei && nikkeiValue ? (nikkeiValue / baseNikkei) * 100 : null,
      topixIndex: baseTopix && topixValue ? (topixValue / baseTopix) * 100 : null,
    };
  });

  return NextResponse.json({ points });
}
