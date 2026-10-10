import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db/client';
import {
  calcAssetValueJpy,
  calcAssetDistributionJpy,
  calcMonthlyDistributionJpy,
  calcPortfolioGain,
  toNumber,
  hasAutoPrice,
  ASSET_TYPE_LABEL,
  type AssetWithValuations,
} from '@/lib/portfolio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 外部（Claudeのプロジェクト等）から読み取り専用でポートフォリオ概要を取得するためのエンドポイント。
// ログインCookieではなく EXPORT_TOKEN 環境変数と一致するトークンでのみ許可する。
// 書き込みは一切行わない（GETのみ）。
function tokenOk(req: NextRequest): boolean {
  const expected = process.env.EXPORT_TOKEN;
  // 未設定、または短すぎるトークンでは開けない（事故でデータが公開されるのを防ぐ）
  if (!expected || expected.length < 16) return false;

  const auth = req.headers.get('authorization');
  const provided =
    (auth && auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null) ??
    req.nextUrl.searchParams.get('token') ??
    '';

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!tokenOk(req)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const [assets, rateRow] = await Promise.all([
    prisma.asset.findMany({
      include: { valuations: { orderBy: { valuedAt: 'desc' } } },
      orderBy: { id: 'asc' },
    }),
    prisma.exchangeRate.findFirst({
      where: { pair: 'USDJPY' },
      orderBy: { fetchedAt: 'desc' },
    }),
  ]);

  const usdJpyRate = rateRow ? toNumber(rateRow.rate) : 1;
  const rateMissing = !rateRow; // USDJPYレート未取得（USD建て資産の円換算が概算になる）

  const list = assets as unknown as AssetWithValuations[];

  const totalValueJpy = list.reduce((sum, a) => sum + calcAssetValueJpy(a, usdJpyRate), 0);
  const gain = calcPortfolioGain(list, usdJpyRate);
  const { monthly, unscheduled } = calcMonthlyDistributionJpy(list, usdJpyRate);
  const annualDistributionJpy = monthly.reduce((sum, n) => sum + n, 0) + unscheduled;

  // 資産クラス別内訳（STOCK/BOND/FUND/PRIVATE）
  const classMap = new Map<string, number>();
  for (const a of list) {
    classMap.set(a.type, (classMap.get(a.type) ?? 0) + calcAssetValueJpy(a, usdJpyRate));
  }
  const byAssetClass = [...classMap.entries()].map(([type, valueJpy]) => ({
    type,
    label: ASSET_TYPE_LABEL[type as keyof typeof ASSET_TYPE_LABEL] ?? type,
    valueJpy,
    percent: totalValueJpy > 0 ? (valueJpy / totalValueJpy) * 100 : 0,
  }));

  const assetList = list.map((a) => ({
    id: a.id,
    type: a.type,
    market: a.market,
    name: a.name,
    ticker: a.ticker,
    currency: a.currency,
    ownerType: a.ownerType,
    broker: a.broker,
    quantity: hasAutoPrice(a.type) ? toNumber(a.quantity) : null,
    currentPrice: toNumber(a.currentPrice) || null,
    valueJpy: calcAssetValueJpy(a, usdJpyRate),
    annualDistributionJpy: calcAssetDistributionJpy(a, usdJpyRate),
    distributionMonths: a.distributionMonths,
  }));

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    usdJpyRate,
    rateMissing,
    totals: {
      totalValueJpy,
      gainJpy: gain.gain,
      gainPercent: gain.percent,
      annualDistributionJpy,
      monthlyDistributionJpy: monthly,
      unscheduledDistributionJpy: unscheduled,
      assetCount: list.length,
    },
    byAssetClass,
    assets: assetList,
  });
}
