import Link from 'next/link';
import { prisma } from '@/lib/db/client';
import {
  calcAssetValueJpy,
  calcAssetDistributionJpy,
  calcMonthlyDistributionJpy,
  calcPortfolioGain,
  isDistributionInfoOverdue,
  calcAfterTaxAmount,
  calcCorporateWithholding,
  calcAssetGainJpy,
  DIVIDEND_TAX_RATE,
  CORPORATE_WITHHOLDING_RATE,
  ASSET_TYPE_LABEL,
  formatJpy,
  type AssetWithValuations,
} from '@/lib/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshAllButton } from './_components/RefreshAllButton';
import { PortfolioBreakdownChart } from './_components/PortfolioBreakdownChart';
import { PortfolioValueChart } from './_components/PortfolioValueChart';
import { MarketNewsCard } from './_components/MarketNewsCard';

export const dynamic = 'force-dynamic';

const ASSET_ORDER = ['STOCK', 'BOND', 'FUND', 'PRIVATE'] as const;

export default async function DashboardPage() {
  const [assets, latestRate, allocationTargets] = await Promise.all([
    prisma.asset.findMany({
      include: { valuations: { orderBy: { valuedAt: 'desc' }, take: 1 } },
    }),
    prisma.exchangeRate.findFirst({ where: { pair: 'USDJPY' }, orderBy: { fetchedAt: 'desc' } }),
    prisma.allocationTarget.findMany(),
  ]);

  const usdJpyRate = latestRate ? Number(latestRate.rate) : 150; // フォールバック値（未取得時の概算）
  const typed = assets as unknown as AssetWithValuations[];

  const totalValue = typed.reduce((sum, a) => sum + calcAssetValueJpy(a, usdJpyRate), 0);
  const totalDistribution = typed.reduce((sum, a) => sum + calcAssetDistributionJpy(a, usdJpyRate), 0);
  const individualDistribution = typed
    .filter((a) => a.ownerType === 'INDIVIDUAL')
    .reduce((sum, a) => sum + calcAssetDistributionJpy(a, usdJpyRate), 0);
  const corporateDistribution = typed
    .filter((a) => a.ownerType === 'CORPORATE')
    .reduce((sum, a) => sum + calcAssetDistributionJpy(a, usdJpyRate), 0);
  const portfolioGain = calcPortfolioGain(typed, usdJpyRate);

  // 損益通算シミュレーション（個人保有・含み損のある資産のみ対象）。
  // 実際に売却（実現）して初めて使える制度である旨、および同一年の他の譲渡益や
  // 申告分離課税を選択した配当所得との相殺が前提である旨に注意。
  const individualLossAssets = typed
    .filter((a) => a.ownerType === 'INDIVIDUAL')
    .map((a) => ({ id: a.id, name: a.name, gain: calcAssetGainJpy(a, usdJpyRate) }))
    .filter((g): g is { id: number; name: string; gain: number } => g.gain !== null && g.gain < 0)
    .sort((a, b) => a.gain - b.gain);
  const totalIndividualLoss = individualLossAssets.reduce((sum, g) => sum + g.gain, 0);
  const potentialTaxSaving = Math.abs(totalIndividualLoss) * DIVIDEND_TAX_RATE;
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

  const targetByType = new Map(allocationTargets.map((t) => [t.assetType, Number(t.targetPercent)]));
  const allocationComparison =
    targetByType.size > 0
      ? ASSET_ORDER.filter((type) => targetByType.has(type) || breakdown.some((b) => b.type === type)).map(
          (type) => {
            const value = breakdown.find((b) => b.type === type)?.value ?? 0;
            const actualPercent = totalValue > 0 ? (value / totalValue) * 100 : 0;
            const targetPercent = targetByType.get(type) ?? null;
            return {
              type,
              label: ASSET_TYPE_LABEL[type],
              actualPercent,
              targetPercent,
              diff: targetPercent !== null ? actualPercent - targetPercent : null,
            };
          }
        )
      : [];

  // 集中リスクスコア（ハーフィンダール指数、HHI）: 各資産の構成比%を2乗して合計。0〜10000で、
  // 数値が大きいほど特定の資産・証券会社に偏っている。
  function calcHhi(values: number[], total: number): number {
    if (total <= 0) return 0;
    return values.reduce((sum, v) => sum + (v / total) * 100 * ((v / total) * 100), 0);
  }
  const assetHhi = calcHhi(
    typed.map((a) => calcAssetValueJpy(a, usdJpyRate)),
    totalValue
  );
  const brokerValuesForHhi = new Map<string, number>();
  for (const asset of typed) {
    const broker = asset.broker?.trim() || '未設定';
    brokerValuesForHhi.set(broker, (brokerValuesForHhi.get(broker) ?? 0) + calcAssetValueJpy(asset, usdJpyRate));
  }
  const brokerHhi = calcHhi([...brokerValuesForHhi.values()], totalValue);
  const topHoldings = [...typed]
    .map((a) => ({ id: a.id, name: a.name, value: calcAssetValueJpy(a, usdJpyRate) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  const top3Percent = totalValue > 0 ? (topHoldings.reduce((s, t) => s + t.value, 0) / totalValue) * 100 : 0;
  function hhiLevel(hhi: number): { label: string; color: string } {
    if (hhi < 1500) return { label: '分散度良好', color: 'text-green-600' };
    if (hhi < 2500) return { label: 'やや集中', color: 'text-amber-600' };
    return { label: '集中度が高い', color: 'text-red-600' };
  }

  const gainContributions = typed
    .map((a) => ({ id: a.id, name: a.name, gain: calcAssetGainJpy(a, usdJpyRate) }))
    .filter((g): g is { id: number; name: string; gain: number } => g.gain !== null && g.gain !== 0)
    .sort((a, b) => b.gain - a.gain);
  const topGainers = gainContributions.slice(0, 5);
  const topLosers = gainContributions
    .filter((g) => g.gain < 0)
    .slice(-5)
    .reverse();

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
            {individualDistribution > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                個人保有分 税引後目安: {formatJpy(calcAfterTaxAmount(individualDistribution))}（源泉徴収
                {(DIVIDEND_TAX_RATE * 100).toFixed(3)}%、NISA等は考慮せず概算）
              </p>
            )}
            {corporateDistribution > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                法人保有分 源泉徴収額(参考): {formatJpy(calcCorporateWithholding(corporateDistribution))}（
                {(CORPORATE_WITHHOLDING_RATE * 100).toFixed(3)}%、法人税から控除される前払いのため「手取り」は算出せず）
              </p>
            )}
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
          <CardTitle className="text-base">資産評価額・含み損益の推移</CardTitle>
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
          {allocationComparison.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">目標配分とのズレ</p>
              <table className="w-full text-sm">
                <tbody>
                  {allocationComparison.map((row) => (
                    <tr key={row.type} className="border-b last:border-0">
                      <td className="py-1.5">{row.label}</td>
                      <td className="py-1.5 text-right text-gray-500">{row.actualPercent.toFixed(1)}%</td>
                      <td className="py-1.5 text-right text-gray-400">
                        {row.targetPercent !== null ? `目標 ${row.targetPercent.toFixed(1)}%` : '目標未設定'}
                      </td>
                      <td
                        className={`py-1.5 text-right font-medium w-20 ${
                          row.diff === null
                            ? 'text-gray-300'
                            : Math.abs(row.diff) < 1
                              ? 'text-gray-400'
                              : row.diff > 0
                                ? 'text-red-600'
                                : 'text-blue-600'
                        }`}
                      >
                        {row.diff !== null ? `${row.diff > 0 ? '+' : ''}${row.diff.toFixed(1)}pt` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2">
                <Link href="/settings" className="underline">
                  設定
                </Link>
                で目標配分を変更できます。
              </p>
            </div>
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

      {gainContributions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">銘柄別の含み損益寄与度</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">含み益への貢献 上位</p>
              <ul className="space-y-1 text-sm">
                {topGainers.map((g) => (
                  <li key={g.id} className="flex justify-between border-b last:border-0 py-1">
                    <Link href={`/assets/${g.id}`} className="text-blue-700 hover:underline truncate mr-2">
                      {g.name}
                    </Link>
                    <span className={g.gain >= 0 ? 'text-green-600' : 'text-red-600'}>{formatJpy(g.gain)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">含み損の大きい銘柄</p>
              {topLosers.length === 0 ? (
                <p className="text-sm text-gray-400">含み損の銘柄はありません</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {topLosers.map((g) => (
                    <li key={g.id} className="flex justify-between border-b last:border-0 py-1">
                      <Link href={`/assets/${g.id}`} className="text-blue-700 hover:underline truncate mr-2">
                        {g.name}
                      </Link>
                      <span className="text-red-600">{formatJpy(g.gain)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-gray-400 sm:col-span-2">
              取得単価が入力されている資産のみ対象です（{gainContributions.length}件）。
            </p>
          </CardContent>
        </Card>
      )}

      {totalValue > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">集中リスクスコア</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">銘柄の集中度（HHI）</p>
                <p className={`text-xl font-bold ${hhiLevel(assetHhi).color}`}>
                  {Math.round(assetHhi).toLocaleString('ja-JP')}{' '}
                  <span className="text-sm font-normal">（{hhiLevel(assetHhi).label}）</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">証券会社の集中度（HHI）</p>
                <p className={`text-xl font-bold ${hhiLevel(brokerHhi).color}`}>
                  {Math.round(brokerHhi).toLocaleString('ja-JP')}{' '}
                  <span className="text-sm font-normal">（{hhiLevel(brokerHhi).label}）</span>
                </p>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <p>
                上位3銘柄で保有全体の <span className="font-medium">{top3Percent.toFixed(1)}%</span> を占めています：
              </p>
              <ul className="mt-1 space-y-0.5">
                {topHoldings.map((h) => (
                  <li key={h.id}>
                    <Link href={`/assets/${h.id}`} className="text-blue-700 hover:underline">
                      {h.name}
                    </Link>
                    <span className="text-gray-400 ml-2">
                      {totalValue > 0 ? ((h.value / totalValue) * 100).toFixed(1) : '0'}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              HHI（ハーフィンダール指数）は各資産・証券会社の構成比を2乗して合計した指標（0〜10000）で、数値が大きいほど偏りが大きいことを示します。1500未満は分散度良好、2500以上は集中度が高い目安です。
            </p>
          </CardContent>
        </Card>
      )}

      {individualLossAssets.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">損益通算シミュレーション（個人保有分）</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-900">
              含み損の合計: <span className="font-semibold">{formatJpy(totalIndividualLoss)}</span>
              　実現した場合の節税額目安:{' '}
              <span className="font-semibold">{formatJpy(potentialTaxSaving)}</span>
            </p>
            <ul className="mt-2 space-y-0.5 text-sm">
              {individualLossAssets.map((g) => (
                <li key={g.id} className="flex justify-between">
                  <Link href={`/assets/${g.id}`} className="text-amber-900 underline hover:text-amber-700">
                    {g.name}
                  </Link>
                  <span className="text-red-700">{formatJpy(g.gain)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-700 mt-3">
              ※ あくまで試算です。実際に売却（実現）して初めて使える制度で、同一年の他の譲渡益や（申告分離課税を選択した場合の）配当所得との相殺が前提です。相殺しきれない損失は翌年以降3年間繰り越せます（確定申告が必要）。法人保有分は対象外（法人税の損金算入は別の仕組みのため）。
            </p>
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

      <MarketNewsCard />

      <p className="text-xs text-gray-400 text-right">
        為替レート(USD/JPY):{' '}
        {latestRate
          ? `${Number(latestRate.rate).toFixed(2)}円（${new Date(latestRate.fetchedAt).toLocaleString('ja-JP')}時点）`
          : '未取得（150円で概算表示中。「株価を更新」で取得されます）'}
      </p>
    </div>
  );
}
