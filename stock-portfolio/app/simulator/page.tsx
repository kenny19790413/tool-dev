import { prisma } from '@/lib/db/client';
import {
  calcAssetValueJpy,
  calcAssetDistributionJpy,
  calcAfterTaxAmount,
  calcCorporateWithholding,
  formatJpy,
  type AssetWithValuations,
} from '@/lib/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReinvestmentSimulator } from './_components/ReinvestmentSimulator';

export const dynamic = 'force-dynamic';

export default async function SimulatorPage() {
  const [assets, latestRate] = await Promise.all([
    prisma.asset.findMany({ include: { valuations: { orderBy: { valuedAt: 'desc' }, take: 1 } } }),
    prisma.exchangeRate.findFirst({ where: { pair: 'USDJPY' }, orderBy: { fetchedAt: 'desc' } }),
  ]);
  const usdJpyRate = latestRate ? Number(latestRate.rate) : 150;
  const typed = assets as unknown as AssetWithValuations[];

  const totalValue = typed.reduce((sum, a) => sum + calcAssetValueJpy(a, usdJpyRate), 0);
  const individualDistribution = typed
    .filter((a) => a.ownerType === 'INDIVIDUAL')
    .reduce((sum, a) => sum + calcAssetDistributionJpy(a, usdJpyRate), 0);
  const corporateDistribution = typed
    .filter((a) => a.ownerType === 'CORPORATE')
    .reduce((sum, a) => sum + calcAssetDistributionJpy(a, usdJpyRate), 0);
  const netAnnualDistribution =
    calcAfterTaxAmount(individualDistribution) + (corporateDistribution - calcCorporateWithholding(corporateDistribution));
  const initialYieldRate = totalValue > 0 ? netAnnualDistribution / totalValue : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">配当再投資シミュレーション</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">現在の状況</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-1">
          <p>現在の総資産額: {formatJpy(totalValue)}</p>
          <p>
            税引後・源泉徴収後の年間配当・分配金（概算）: {formatJpy(netAnnualDistribution)}（利回り{' '}
            {(initialYieldRate * 100).toFixed(2)}%）
          </p>
        </CardContent>
      </Card>
      <ReinvestmentSimulator initialValue={totalValue} initialYieldRate={initialYieldRate} />
    </div>
  );
}
