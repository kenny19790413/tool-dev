import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getQuote, getDividendPerShare, getDividendMonths, getAnalystTarget, inferMarket } from '@/lib/stock/yahoo';
import { fetchFundNav } from '@/lib/stock/fundNav';

export async function GET() {
  const assets = await prisma.asset.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    include: { valuations: { orderBy: { valuedAt: 'desc' }, take: 1 } },
  });
  return NextResponse.json({ assets });
}

function parseDistributionMonths(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type;
    const distributionMonths = parseDistributionMonths(body.distributionMonths);

    if (type === 'STOCK') {
      const ticker = String(body.ticker ?? '').trim();
      const quantity = Number(body.quantity);
      if (!ticker) return NextResponse.json({ error: '銘柄を選択してください' }, { status: 400 });
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: '数量を正しく入力してください' }, { status: 400 });
      }

      const quote = await getQuote(ticker);
      const dividendPerShare = await getDividendPerShare(ticker);
      // ユーザーが手動で月を選択していなければ、過去の配当履歴から自動推定する
      const resolvedMonths = distributionMonths.length > 0 ? distributionMonths : await getDividendMonths(ticker);
      const analystTarget = await getAnalystTarget(ticker);

      const asset = await prisma.asset.create({
        data: {
          type: 'STOCK',
          market: inferMarket(ticker),
          name: String(body.name ?? quote.name ?? ticker),
          ticker,
          currency: quote.currency,
          quantity,
          avgCost:
            body.avgCost !== undefined && body.avgCost !== null && body.avgCost !== ''
              ? Number(body.avgCost)
              : null,
          broker: body.broker || null,
          note: body.note || null,
          currentPrice: quote.price,
          dividendPerShare,
          priceUpdatedAt: new Date(),
          distributionMonths: resolvedMonths,
          targetMeanPrice: analystTarget.targetMeanPrice,
          targetHighPrice: analystTarget.targetHighPrice,
          targetLowPrice: analystTarget.targetLowPrice,
          recommendationKey: analystTarget.recommendationKey,
          numberOfAnalystOpinions: analystTarget.numberOfAnalystOpinions,
          analystDataUpdatedAt: new Date(),
        },
      });
      return NextResponse.json({ asset });
    }

    if (type === 'FUND') {
      const fundUrl = String(body.fundUrl ?? '').trim();
      const quantity = Number(body.quantity);
      if (!fundUrl) return NextResponse.json({ error: 'ファンドの公式ページURLを入力してください' }, { status: 400 });
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: '口数を正しく入力してください' }, { status: 400 });
      }

      const info = await fetchFundNav(fundUrl);

      const asset = await prisma.asset.create({
        data: {
          type: 'FUND',
          name: String(body.name ?? info.name ?? fundUrl),
          fundUrl,
          currency: 'JPY',
          quantity,
          avgCost:
            body.avgCost !== undefined && body.avgCost !== null && body.avgCost !== ''
              ? Number(body.avgCost)
              : null,
          broker: body.broker || null,
          note: body.note || null,
          currentPrice: info.nav,
          priceUpdatedAt: new Date(),
          annualDistribution:
            body.annualDistribution !== undefined && body.annualDistribution !== null && body.annualDistribution !== ''
              ? Number(body.annualDistribution)
              : null,
          distributionMonths,
        },
      });
      return NextResponse.json({ asset });
    }

    if (type === 'BOND' || type === 'PRIVATE') {
      const name = String(body.name ?? '').trim();
      const initialValue = Number(body.initialValue);
      const currency = body.currency === 'USD' ? 'USD' : 'JPY';
      if (!name) return NextResponse.json({ error: '名称を入力してください' }, { status: 400 });
      if (!Number.isFinite(initialValue) || initialValue < 0) {
        return NextResponse.json({ error: '評価額を正しく入力してください' }, { status: 400 });
      }

      const asset = await prisma.asset.create({
        data: {
          type,
          name,
          currency,
          broker: body.broker || null,
          note: body.note || null,
          annualDistribution:
            body.annualDistribution !== undefined && body.annualDistribution !== null && body.annualDistribution !== ''
              ? Number(body.annualDistribution)
              : null,
          distributionMonths,
          valuations: { create: { value: initialValue } },
        },
        include: { valuations: true },
      });
      return NextResponse.json({ asset });
    }

    return NextResponse.json({ error: '資産種別が不正です' }, { status: 400 });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'サーバーエラー';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
