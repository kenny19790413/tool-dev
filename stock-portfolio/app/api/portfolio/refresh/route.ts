import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getQuote, getDividendPerShare, getDividendMonths, getAnalystTarget, getUsdJpyRate } from '@/lib/stock/yahoo';
import { fetchFundNav } from '@/lib/stock/fundNav';
import { calcAssetValueJpy, type AssetWithValuations } from '@/lib/portfolio';

export async function POST() {
  const [stocks, funds] = await Promise.all([
    prisma.asset.findMany({ where: { type: 'STOCK', ticker: { not: null } } }),
    prisma.asset.findMany({ where: { type: 'FUND', fundUrl: { not: null } } }),
  ]);

  const stockResults = await Promise.allSettled(
    stocks.map(async (asset) => {
      const quote = await getQuote(asset.ticker!);
      const dividendPerShare = await getDividendPerShare(asset.ticker!);
      const distributionMonths =
        asset.distributionMonths.length > 0 ? undefined : await getDividendMonths(asset.ticker!);
      const analystTarget = await getAnalystTarget(asset.ticker!);
      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          currentPrice: quote.price,
          currency: quote.currency,
          dividendPerShare,
          priceUpdatedAt: new Date(),
          ...(distributionMonths !== undefined ? { distributionMonths } : {}),
          targetMeanPrice: analystTarget.targetMeanPrice,
          targetHighPrice: analystTarget.targetHighPrice,
          targetLowPrice: analystTarget.targetLowPrice,
          recommendationKey: analystTarget.recommendationKey,
          numberOfAnalystOpinions: analystTarget.numberOfAnalystOpinions,
          analystDataUpdatedAt: new Date(),
        },
      });
    })
  );

  const fundResults = await Promise.allSettled(
    funds.map(async (asset) => {
      const info = await fetchFundNav(asset.fundUrl!);
      await prisma.asset.update({
        where: { id: asset.id },
        data: { currentPrice: info.nav, priceUpdatedAt: new Date() },
      });
    })
  );

  let rateUpdated = false;
  let usdJpyRate = 150;
  try {
    usdJpyRate = await getUsdJpyRate();
    await prisma.exchangeRate.create({ data: { pair: 'USDJPY', rate: usdJpyRate } });
    rateUpdated = true;
  } catch (e) {
    console.error('為替レート取得失敗', e);
    const latestRate = await prisma.exchangeRate.findFirst({ where: { pair: 'USDJPY' }, orderBy: { fetchedAt: 'desc' } });
    if (latestRate) usdJpyRate = Number(latestRate.rate);
  }

  try {
    const allAssets = await prisma.asset.findMany({
      include: { valuations: { orderBy: { valuedAt: 'desc' }, take: 1 } },
    });
    const totalValueJpy = (allAssets as unknown as AssetWithValuations[]).reduce(
      (sum, a) => sum + calcAssetValueJpy(a, usdJpyRate),
      0
    );
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await prisma.portfolioSnapshot.upsert({
      where: { date: today },
      update: { totalValueJpy },
      create: { date: today, totalValueJpy },
    });
  } catch (e) {
    console.error('評価額スナップショット保存失敗', e);
  }

  const allResults = [...stockResults, ...fundResults];
  const failed = allResults.filter((r) => r.status === 'rejected').length;
  return NextResponse.json({
    ok: true,
    updated: allResults.length - failed,
    failed,
    rateUpdated,
  });
}
