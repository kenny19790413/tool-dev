import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import {
  calcAssetValueJpy,
  calcAssetDistributionJpy,
  calcAssetGainJpy,
  calcUpsidePercent,
  hasDistributionInfo,
  ASSET_TYPE_LABEL,
  MARKET_LABEL,
  RECOMMENDATION_LABEL,
  FUND_NAV_UNIT,
  hasAutoPrice,
  formatJpy,
  formatCurrency,
  toNumber,
  type AssetWithValuations,
} from '@/lib/portfolio';
import { PriceHistoryChart } from './_components/PriceHistoryChart';
import { NewsList } from './_components/NewsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshPriceButton } from './_components/RefreshPriceButton';
import { EditAssetForm } from './_components/EditAssetForm';
import { AddValuationForm } from './_components/AddValuationForm';
import { DistributionReceiptSection } from './_components/DistributionReceiptSection';
import { DeleteAssetButton } from './_components/DeleteAssetButton';

export const dynamic = 'force-dynamic';

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = Number(id);
  if (!Number.isFinite(assetId)) notFound();

  const [asset, latestRate] = await Promise.all([
    prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        valuations: { orderBy: { valuedAt: 'desc' } },
        distributionReceipts: { orderBy: { receivedAt: 'desc' } },
      },
    }),
    prisma.exchangeRate.findFirst({ where: { pair: 'USDJPY' }, orderBy: { fetchedAt: 'desc' } }),
  ]);
  if (!asset) notFound();

  const usdJpyRate = latestRate ? Number(latestRate.rate) : 150;
  const typedAsset = asset as unknown as AssetWithValuations;

  const value = calcAssetValueJpy(typedAsset, usdJpyRate);
  const distribution = calcAssetDistributionJpy(typedAsset, usdJpyRate);
  const distributionInfo = hasDistributionInfo(typedAsset);
  const gain = calcAssetGainJpy(typedAsset, usdJpyRate);
  const isStock = asset.type === 'STOCK';
  const isFund = asset.type === 'FUND';
  const autoPriced = hasAutoPrice(asset.type);
  const isManualValuation = asset.type === 'BOND' || asset.type === 'PRIVATE';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{ASSET_TYPE_LABEL[asset.type]}</Badge>
            {asset.market && <span className="text-xs text-gray-400">{MARKET_LABEL[asset.market]}</span>}
            {isManualValuation && asset.currency === 'USD' && (
              <span className="text-xs text-gray-400">米ドル建て</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{asset.name}</h1>
          {asset.ticker && <p className="text-sm text-gray-400">{asset.ticker}</p>}
          {asset.fundUrl && (
            <a
              href={asset.fundUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {asset.fundUrl}
            </a>
          )}
          {asset.broker && <p className="text-sm text-gray-400">証券会社: {asset.broker}</p>}
        </div>
        <div className="flex gap-2">
          {autoPriced && <RefreshPriceButton assetId={asset.id} />}
          <DeleteAssetButton assetId={asset.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-500">評価額</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-800">{formatJpy(value)}</p>
          </CardContent>
        </Card>
        {autoPriced && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-gray-500">含み損益</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  gain !== null ? (gain >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-300'
                }`}
              >
                {gain !== null ? formatJpy(gain) : '取得単価未入力'}
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-500">年間配当・分配金見込み</CardTitle>
          </CardHeader>
          <CardContent>
            {!distributionInfo ? (
              <p className="text-2xl font-bold text-gray-300">未入力</p>
            ) : distribution > 0 ? (
              <>
                <p className="text-2xl font-bold text-blue-700">{formatJpy(distribution)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {asset.distributionMonths.length > 0
                    ? `入金月: ${asset.distributionMonths.map((m) => `${m}月`).join('・')}`
                    : '入金月: 未設定'}
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold text-gray-400">分配金なし</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isStock && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">株式情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-gray-600">
            <p>保有数量: {toNumber(asset.quantity).toLocaleString('ja-JP')}</p>
            <p>
              現在値: {toNumber(asset.currentPrice).toLocaleString('ja-JP')} {asset.currency}
            </p>
            <p>
              取得単価:{' '}
              {asset.avgCost !== null ? `${toNumber(asset.avgCost).toLocaleString('ja-JP')} ${asset.currency}` : '未入力'}
            </p>
            <p>
              年間配当/株:{' '}
              {asset.dividendPerShare !== null
                ? `${toNumber(asset.dividendPerShare).toLocaleString('ja-JP')} ${asset.currency}`
                : '取得できませんでした'}
            </p>
            <p className="text-xs text-gray-400">
              最終更新: {asset.priceUpdatedAt ? new Date(asset.priceUpdatedAt).toLocaleString('ja-JP') : '未更新'}
            </p>
          </CardContent>
        </Card>
      )}

      {isStock && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">アナリスト目標株価</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-gray-600">
            {asset.targetMeanPrice === null ? (
              <p className="text-gray-300">データなし（アナリストカバレッジがない銘柄の可能性があります）</p>
            ) : (
              <>
                {(() => {
                  const upside = calcUpsidePercent(toNumber(asset.currentPrice), toNumber(asset.targetMeanPrice));
                  if (upside === null) return null;
                  const isUp = upside >= 0;
                  return (
                    <p
                      className={`text-2xl font-bold flex items-center gap-1 ${isUp ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {isUp ? '↑' : '↓'} {isUp ? '+' : ''}
                      {upside.toFixed(1)}%
                      <span className="text-xs font-normal text-gray-400">（1年後の見通し）</span>
                    </p>
                  );
                })()}
                <p>
                  平均目標株価: {toNumber(asset.targetMeanPrice).toLocaleString('ja-JP')} {asset.currency}
                </p>
                <p className="text-xs text-gray-400">
                  レンジ: {asset.targetLowPrice !== null ? toNumber(asset.targetLowPrice).toLocaleString('ja-JP') : '-'}
                  {' 〜 '}
                  {asset.targetHighPrice !== null ? toNumber(asset.targetHighPrice).toLocaleString('ja-JP') : '-'}{' '}
                  {asset.currency}
                </p>
                <p>
                  推奨度:{' '}
                  {asset.recommendationKey
                    ? (RECOMMENDATION_LABEL[asset.recommendationKey] ?? asset.recommendationKey)
                    : '不明'}
                  {asset.numberOfAnalystOpinions !== null && `（アナリスト${asset.numberOfAnalystOpinions}人）`}
                </p>
                <p className="text-xs text-gray-400">
                  {asset.analystDataUpdatedAt
                    ? `最終更新: ${new Date(asset.analystDataUpdatedAt).toLocaleString('ja-JP')}`
                    : ''}
                </p>
              </>
            )}
            <p className="text-xs text-gray-400 pt-1 border-t mt-2">
              ※ Yahoo Financeが集計する証券アナリストの目標株価です。将来の株価を保証するものではなく、投資判断は自己責任で行ってください。
            </p>
          </CardContent>
        </Card>
      )}

      {isStock && <PriceHistoryChart assetId={asset.id} currency={asset.currency} />}

      {isStock && <NewsList assetId={asset.id} />}

      {isFund && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">投資信託情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-gray-600">
            <p>保有口数: {toNumber(asset.quantity).toLocaleString('ja-JP')}</p>
            <p>基準価額: {toNumber(asset.currentPrice).toLocaleString('ja-JP')}円 / {FUND_NAV_UNIT.toLocaleString('ja-JP')}口</p>
            <p>
              取得時基準価額:{' '}
              {asset.avgCost !== null
                ? `${toNumber(asset.avgCost).toLocaleString('ja-JP')}円 / ${FUND_NAV_UNIT.toLocaleString('ja-JP')}口`
                : '未入力'}
            </p>
            <p className="text-xs text-gray-400">
              最終更新: {asset.priceUpdatedAt ? new Date(asset.priceUpdatedAt).toLocaleString('ja-JP') : '未更新'}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">配当・分配金の受取記録</CardTitle>
        </CardHeader>
        <CardContent>
          <DistributionReceiptSection
            assetId={asset.id}
            currency={asset.currency}
            receipts={asset.distributionReceipts.map((r) => ({
              id: r.id,
              amount: toNumber(r.amount),
              receivedAt: r.receivedAt.toISOString(),
              note: r.note,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">編集</CardTitle>
        </CardHeader>
        <CardContent>
          <EditAssetForm
            assetId={asset.id}
            quantity={asset.quantity !== null ? toNumber(asset.quantity) : null}
            avgCost={asset.avgCost !== null ? toNumber(asset.avgCost) : null}
            broker={asset.broker}
            note={asset.note}
            showQuantityFields={autoPriced}
            annualDistribution={asset.annualDistribution !== null ? toNumber(asset.annualDistribution) : null}
            distributionCurrency={asset.currency}
            showDistributionField={!isStock}
            distributionMonths={asset.distributionMonths}
          />
        </CardContent>
      </Card>

      {isManualValuation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">評価額の履歴</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddValuationForm assetId={asset.id} currency={asset.currency} />
            <div className="divide-y">
              {typedAsset.valuations.map((v) => (
                <div key={v.id} className="py-2 flex justify-between text-sm">
                  <span className="text-gray-500">
                    {new Date(v.valuedAt).toLocaleString('ja-JP')}
                    {v.note ? ` — ${v.note}` : ''}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(toNumber(v.value), asset.currency)}
                    {asset.currency === 'USD' && (
                      <span className="text-gray-400 font-normal"> （{formatJpy(toNumber(v.value) * usdJpyRate)}）</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
