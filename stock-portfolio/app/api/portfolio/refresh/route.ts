import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getQuote, getDividendPerShare, getDividendMonths, getUsdJpyRate } from '@/lib/stock/yahoo';
import { fetchFundNav } from '@/lib/stock/fundNav';

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
      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          currentPrice: quote.price,
          currency: quote.currency,
          dividendPerShare,
          priceUpdatedAt: new Date(),
          ...(distributionMonths !== undefined ? { distributionMonths } : {}),
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
  try {
    const rate = await getUsdJpyRate();
    await prisma.exchangeRate.create({ data: { pair: 'USDJPY', rate } });
    rateUpdated = true;
  } catch (e) {
    console.error('為替レート取得失敗', e);
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
