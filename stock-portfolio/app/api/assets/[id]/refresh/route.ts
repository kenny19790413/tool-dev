import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getQuote, getDividendPerShare, getDividendMonths, getAnalystTarget, getStockSplits } from '@/lib/stock/yahoo';
import { fetchFundNav } from '@/lib/stock/fundNav';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id: Number(id) } });
  if (!asset) return NextResponse.json({ error: '資産が見つかりません' }, { status: 404 });

  try {
    if (asset.type === 'STOCK' && asset.ticker) {
      const quote = await getQuote(asset.ticker);
      const dividendPerShare = await getDividendPerShare(asset.ticker);
      // 配当月が未設定の場合のみ自動推定で埋める（ユーザーの手動設定は上書きしない）
      const distributionMonths = asset.distributionMonths.length > 0 ? undefined : await getDividendMonths(asset.ticker);
      const analystTarget = await getAnalystTarget(asset.ticker);
      // 前回更新日以降（初回は直近30日）に発生した株式分割・併合を検知。quantity/avgCostは自動では書き換えず、
      // アラートとして保持し、ユーザーが内容を確認して手動で反映するまで残す。
      const splitsSince = asset.priceUpdatedAt ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const splits = await getStockSplits(asset.ticker, splitsSince);
      const latestSplit = splits.length > 0 ? splits[splits.length - 1] : null;

      const updated = await prisma.asset.update({
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
          ...(latestSplit
            ? {
                splitAlert: `${latestSplit.date}: ${latestSplit.label}の株式分割・併合を検知しました（比率 x${latestSplit.ratio}）`,
                splitAlertRatio: latestSplit.ratio,
                splitAlertAt: new Date(latestSplit.date),
              }
            : {}),
        },
      });
      return NextResponse.json({ asset: updated });
    }

    if (asset.type === 'FUND' && asset.fundUrl) {
      const info = await fetchFundNav(asset.fundUrl);
      const updated = await prisma.asset.update({
        where: { id: asset.id },
        data: { currentPrice: info.nav, priceUpdatedAt: new Date() },
      });
      return NextResponse.json({ asset: updated });
    }

    return NextResponse.json({ error: 'この資産は自動更新に対応していません' }, { status: 400 });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : '価格の取得に失敗しました';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
