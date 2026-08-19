import Link from 'next/link';
import { prisma } from '@/lib/db/client';
import {
  calcAssetValueJpy,
  calcAssetDistributionJpy,
  calcMonthlyDistributionJpy,
  calcPortfolioGain,
  isDistributionInfoOverdue,
  ASSET_TYPE_LABEL,
  formatJpy,
  type AssetWithValuations,
} from '@/lib/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshAllButton } from './_components/RefreshAllButton';
import { PortfolioBreakdownChart } from './_components/PortfolioBreakdownChart';
import { PortfolioValueChart } from './_components/PortfolioValueChart';

export const dynamic = 'force-dynamic';

const ASSET_ORDER = ['STOCK', 'BOND', 'FUND', 'PRIVATE'] as const;

export default async function DashboardPage() {
  const [assets, latestRate] = await Promise.all([
    prisma.asset.findMany({
      include: { valuations: { orderBy: { valuedAt: 'desc' }, take: 1 } },
    }),
    prisma.exchangeRate.findFirst({ where: { pair: 'USDJPY' }, orderBy: { fetchedAt: 'desc' } }),
  ]);

  const usdJpyRate = latestRate ? Number(latestRate.rate) : 150; // フォールバック値（未取得時の概算）
  const typed = assets as unknown as AssetWithValuations[];

  const totalValue = typed.reduce((sum, a) => sum + calcAssetValueJpy(a, usdJpyRate), 0);
  const totalDistribution = typed.reduce((sum, a) => sum + calcAssetDistributionJpy(a, usdJpyRate), 0);
  const portfolioGain = calcPortfolioGain(typed, usdJpyRate);
  const { monthly: monthlyDistribution, unscheduled: unscheduledDistribution } = calcMonthlyDistributionJpy(
    typed,
    usdJpyRate
  );
  const maxMonthly = Math.max(...monthlyDistribution, 1);

  const breakdown = ASSET_ORDER.map((type) => {
    const items = typed.filter((a) => a.type === type);
    const value = items.reduce((sum, a) => sum + calcAssetValueJpy(a, usdJpyRate), 0);
    return { type, label: ASSET_TYPE_LABEL[type], value, count: items.length };
  }).filter((b) => b.count > 0);

  const brokerTotals = new Map<string, { value: number; count: number }>();
  for (const asset of typed) {
    const broker = asset.broker?.trim() || '未設定';
    const entry = brokerTotals.get(broker) ?? { value: 0, count: 0 };
    entry.value += calcAssetValueJpy(asset, usdJpyRate);
    entry.count += 1;
    brokerTotals.set(broker, entry);
  }
  const brokerBreakdown = [...brokerTotals.entries()]
    .map(([broker, v]) => ({ type: broker, label: broker, value: v.value, count: v.count }))
    .sort((a, b) => b.value - a.value);

  const missingDistributionAssets = typed.filter((a) => a.type === 'PRIVATE' && isDistributionInfoOverdue(a));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
        <RefreshAllButton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-500">総資産</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-800">{formatJpy(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-500">含み損益</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolioGain.trackedCount === 0 ? (
              <p className="text-lg text-gray-300">取得単価が未入力です</p>
            ) : (
              <>
                <p className={`text-3xl font-bold ${portfolioGain.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatJpy(portfolioGain.gain)}
                </p>
                {portfolioGain.percent !== null && (
                  <p className={`text-sm ${portfolioGain.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {portfolioGain.gain >= 0 ? '+' : ''}
                    {portfolioGain.percent.toFixed(1)}%
                  </p>
                )}
                {portfolioGain.untrackedCount > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    取得単価未入力の{portfolioGain.untrackedCount}件は含みません
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-500">年間配当・分配金見込み</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-700">{formatJpy(totalDistribution)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-500">保有資産数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-800">{typed.length}件</p>
          </CardContent>
        </Card>
      </div>

      {missingDistributionAssets.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">
              ⚠ 決算月を過ぎても配当・分配金が未入力のプライベート資産が{missingDistributionAssets.length}件あります
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {missingDistributionAssets.map((a) => (
                <li key={a.id}>
                  <Link href={`/assets/${a.id}`} className="text-amber-900 underline hover:text-amber-700">
                    {a.name}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">資産評価額の推移</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioValueChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">資産クラス別内訳</CardTitle>
        </CardHeader>
        <CardContent>
          {breakdown.length === 0 ? (
            <p className="text-sm text-gray-400">
              まだ資産が登録されていません。
              <Link href="/assets/new" className="text-blue-600 underline">
                資産を追加
              </Link>
              してください。
            </p>
          ) : (
            <PortfolioBreakdownChart data={breakdown} />
          )}
        </CardContent>
      </Card>

      {brokerBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">証券会社別内訳</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioBreakdownChart data={brokerBreakdown} />
          </CardContent>
        </Card>
      )}

      {totalDistribution > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">配当・分配金の入金予定（月別）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {monthlyDistribution.map((amount, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-full h-16 flex items-end bg-gray-50 rounded">
                    {amount > 0 && (
                      <div
                        className="w-full bg-blue-600 rounded"
                        style={{ height: `${Math.max((amount / maxMonthly) * 100, 6)}%` }}
                      />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{i + 1}月</span>
                  <span className="text-[10px] text-gray-400 text-center leading-tight">
                    {amount > 0 ? formatJpy(amount) : '-'}
                  </span>
                </div>
              ))}
            </div>
            {unscheduledDistribution > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                入金月が未設定の見込み額: {formatJpy(unscheduledDistribution)}
                （各資産の詳細画面から「配当・分配金が支払われる月」を設定すると反映されます）
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-gray-400 text-right">
        為替レート(USD/JPY):{' '}
        {latestRate
          ? `${Number(latestRate.rate).toFixed(2)}円（${new Date(latestRate.fetchedAt).toLocaleString('ja-JP')}時点）`
          : '未取得（150円で概算表示中。「株価を更新」で取得されます）'}
      </p>
    </div>
  );
}
