import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import {
  calcAssetValueJpy,
  calcAssetDistributionJpy,
  calcAssetGainJpy,
  calcGainBreakdown,
  calcCostRecoverySummary,
  calcTotalCostJpy,
  calcUpsidePercent,
  calcAfterTaxAmount,
  calcCorporateWithholding,
  hasDistributionInfo,
  ASSET_TYPE_LABEL,
  ASSET_OWNER_TYPE_LABEL,
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
import { SplitAlertBanner } from './_components/SplitAlertBanner';

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
  const gainBreakdown = calcGainBreakdown(typedAsset, usdJpyRate);
  const totalCost = calcTotalCostJpy(typedAsset, usdJpyRate);
  const costRecovery = calcCostRecoverySummary(
    typedAsset,
    usdJpyRate,
    asset.distributionReceipts.map((r) => ({ amount: r.amount }))
  );
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
            <Badge variant="outline">{ASSET_OWNER_TYPE_LABEL[asset.ownerType]}</Badge>
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
          {isManualValuation && asset.valuationUrl && (
            <a
              href={asset.valuationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all block"
            >
              評価額を確認する（外部サイト）
            </a>
          )}
        </div>
        <div className="flex gap-2">
          {autoPriced && <RefreshPriceButton assetId={asset.id} />}
          <DeleteAssetButton assetId={asset.id} />
        </div>
      </div>

      {asset.splitAlert && (
        <SplitAlertBanner
          assetId={asset.id}
          message={asset.splitAlert}
          ratio={toNumber(asset.splitAlertRatio) || 1}
          quantity={asset.quantity !== null ? toNumber(asset.quantity) : null}
          avgCost={asset.avgCost !== null ? toNumber(asset.avgCost) : null}
        />
      )}

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
                {asset.ownerType === 'INDIVIDUAL' ? (
                  <p className="text-xs text-gray-400">税引後目安: {formatJpy(calcAfterTaxAmount(distribution))}</p>
                ) : (
                  <p className="text-xs text-gray-400">
                    源泉徴収額(参考): {formatJpy(calcCorporateWithholding(distribution))}
                    <span className="block">法人税から控除される前払いのため「手取り」は計算していません</span>
                  </p>
                )}
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

      {costRecovery && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">取得コストに対する投資成果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">取得金額（合計）</span>
              <span className="font-medium text-gray-800">{formatJpy(costRecovery.totalCostJpy)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">評価額（現在）</span>
              <span className="font-medium text-gray-800">{formatJpy(value)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">含み損益</span>
              <span className={costRecovery.gainJpy >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatJpy(costRecovery.gainJpy)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">累計配当・分配金（受取実績）</span>
              <span className="text-blue-700">{formatJpy(costRecovery.cumulativeDistributionJpy)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1 font-medium">
              <span className="text-gray-600">配当込みの総合損益</span>
              <span className={costRecovery.totalReturnJpy >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatJpy(costRecovery.totalReturnJpy)}（{costRecovery.totalReturnPercent >= 0 ? '+' : ''}
                {costRecovery.totalReturnPercent.toFixed(1)}%）
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">配当による投資回収率</span>
              <span className="font-medium text-blue-700">{costRecovery.recoveryPercent.toFixed(1)}%</span>
            </div>
            <p className="text-xs text-gray-400 pt-1">
              取得金額（取得単価×数量）を基準に、値上がり・値下がりに加えて実際に受け取った配当・分配金も加味した成果です。「配当による投資回収率」は、これまで受け取った配当・分配金だけで取得金額の何%を回収できたかを示します。
            </p>
          </CardContent>
        </Card>
      )}

      {gainBreakdown && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">含み損益の要因分解（価格変動 / 為替変動）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">価格変動による損益</span>
              <span className={gainBreakdown.priceGainJpy >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatJpy(gainBreakdown.priceGainJpy)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">為替変動による損益</span>
              <span className={gainBreakdown.fxGainJpy >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatJpy(gainBreakdown.fxGainJpy)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1 font-medium">
              <span className="text-gray-600">合計（円ベースの真の損益）</span>
              <span>{formatJpy(gainBreakdown.totalGainJpy)}</span>
            </div>
            <p className="text-xs text-gray-400 pt-1">
              取得時レート {toNumber(asset.avgCostFxRate).toLocaleString('ja-JP')}円、現在レート {usdJpyRate.toLocaleString('ja-JP')}円で計算した概算です。
              上部の「含み損益」（{gain !== null ? formatJpy(gain) : '-'}）は取得時レートを考慮せず現在レートのみで換算した簡易値のため、この合計とは一致しません。
            </p>
          </CardContent>
        </Card>
      )}

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
            {totalCost !== null && <p>取得金額（合計）: {formatJpy(totalCost)}</p>}
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

      {isStock && (asset.shareholderPerk || asset.shareholderPerkMonths.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">株主優待</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-gray-600">
            <p>{asset.shareholderPerk || '内容未入力'}</p>
            {asset.shareholderPerkMonths.length > 0 && (
              <p className="text-xs text-gray-400">
                権利確定月: {asset.shareholderPerkMonths.map((m) => `${m}月`).join('・')}
              </p>
            )}
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
            {totalCost !== null && <p>取得金額（合計）: {formatJpy(totalCost)}</p>}
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
            avgCostFxRate={asset.avgCostFxRate !== null ? toNumber(asset.avgCostFxRate) : null}
            currency={asset.currency}
            broker={asset.broker}
            note={asset.note}
            ownerType={asset.ownerType}
            showQuantityFields={autoPriced}
            annualDistribution={asset.annualDistribution !== null ? toNumber(asset.annualDistribution) : null}
            distributionCurrency={asset.currency}
            showDistributionField={!isStock}
            distributionMonths={asset.distributionMonths}
            showShareholderPerkFields={isStock}
            shareholderPerk={asset.shareholderPerk}
            shareholderPerkMonths={asset.shareholderPerkMonths}
            showValuationUrlField={isManualValuation}
            valuationUrl={asset.valuationUrl}
          />
        </CardContent>
      </Card>

      {isManualValuation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">評価額の履歴</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddValuationForm assetId={asset.id} currency={asset.currency} hasValuationUrl={!!asset.valuationUrl} />
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
