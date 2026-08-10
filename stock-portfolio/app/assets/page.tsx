import Link from 'next/link';
import { prisma } from '@/lib/db/client';
import {
  calcAssetValueJpy,
  calcAssetDistributionJpy,
  calcAssetGainJpy,
  hasDistributionInfo,
  ASSET_TYPE_LABEL,
  MARKET_LABEL,
  formatJpy,
  formatCurrency,
  toNumber,
  type AssetWithValuations,
} from '@/lib/portfolio';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshAllButton } from '@/app/_components/RefreshAllButton';
import type { AssetType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const TABS: { key: AssetType | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'すべて' },
  { key: 'STOCK', label: '単株' },
  { key: 'FUND', label: '投資信託' },
  { key: 'BOND', label: '債券' },
  { key: 'PRIVATE', label: 'プライベート資産' },
];

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const activeTab = TABS.some((t) => t.key === type) ? (type as AssetType | 'ALL') : 'ALL';

  const [assets, latestRate] = await Promise.all([
    prisma.asset.findMany({
      where: activeTab === 'ALL' ? {} : { type: activeTab },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: { valuations: { orderBy: { valuedAt: 'desc' }, take: 1 } },
    }),
    prisma.exchangeRate.findFirst({ where: { pair: 'USDJPY' }, orderBy: { fetchedAt: 'desc' } }),
  ]);
  const usdJpyRate = latestRate ? Number(latestRate.rate) : 150;
  const typed = assets as unknown as AssetWithValuations[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">資産一覧</h1>
        <div className="flex items-center gap-3">
          <RefreshAllButton />
          <Link href="/assets/import" className="text-sm text-blue-600 underline">
            画像から追加
          </Link>
          <Link href="/assets/new" className="text-sm text-blue-600 underline">
            + 資産を追加
          </Link>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'ALL' ? '/assets' : `/assets?type=${t.key}`}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              activeTab === t.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {typed.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-400">
            該当する資産がありません。
            <Link href="/assets/new" className="text-blue-600 underline">
              資産を追加
            </Link>
            してください。
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">種別</th>
                <th className="text-left px-4 py-2 font-medium">銘柄・名称</th>
                <th className="text-right px-4 py-2 font-medium">数量</th>
                <th className="text-right px-4 py-2 font-medium">現在値</th>
                <th className="text-right px-4 py-2 font-medium">評価額(JPY)</th>
                <th className="text-right px-4 py-2 font-medium">損益</th>
                <th className="text-right px-4 py-2 font-medium">配当・分配金</th>
              </tr>
            </thead>
            <tbody>
              {typed.map((asset) => {
                const value = calcAssetValueJpy(asset, usdJpyRate);
                const distribution = calcAssetDistributionJpy(asset, usdJpyRate);
                const gain = calcAssetGainJpy(asset, usdJpyRate);
                const hasInfo = hasDistributionInfo(asset);
                return (
                  <tr key={asset.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="outline">{ASSET_TYPE_LABEL[asset.type]}</Badge>
                      {asset.market && (
                        <span className="ml-1 text-xs text-gray-400">{MARKET_LABEL[asset.market]}</span>
                      )}
                      {(asset.type === 'BOND' || asset.type === 'PRIVATE') && asset.currency === 'USD' && (
                        <span className="ml-1 text-xs text-gray-400">米ドル建て</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/assets/${asset.id}`} className="text-blue-700 hover:underline font-medium">
                        {asset.name}
                      </Link>
                      {asset.ticker && <div className="text-xs text-gray-400">{asset.ticker}</div>}
                      {asset.broker && <div className="text-xs text-gray-400">{asset.broker}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {asset.type === 'STOCK' || asset.type === 'FUND'
                        ? toNumber(asset.quantity).toLocaleString('ja-JP')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {asset.type === 'STOCK'
                        ? `${toNumber(asset.currentPrice).toLocaleString('ja-JP')} ${asset.currency}`
                        : asset.type === 'FUND'
                          ? `${toNumber(asset.currentPrice).toLocaleString('ja-JP')}円/1万口`
                          : asset.currency === 'USD' && asset.valuations[0]
                            ? formatCurrency(toNumber(asset.valuations[0].value), 'USD')
                            : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatJpy(value)}</td>
                    <td
                      className={`px-4 py-3 text-right ${
                        gain !== null ? (gain >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-300'
                      }`}
                    >
                      {gain !== null ? formatJpy(gain) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!hasInfo ? (
                        <span className="text-gray-300">未入力</span>
                      ) : distribution > 0 ? (
                        <>
                          <div>{formatJpy(distribution)}</div>
                          <div className="text-xs text-gray-400">月 {formatJpy(distribution / 12)}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">分配金なし</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
