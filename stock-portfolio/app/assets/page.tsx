import Link from 'next/link';
import { prisma } from '@/lib/db/client';
import {
  calcAssetValueJpy,
  calcAssetDistributionJpy,
  calcAssetGainJpy,
  calcAssetGainPercent,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

type SortKey = 'value' | 'gain';

const SORTABLE: { key: SortKey; label: string; className: string }[] = [
  { key: 'value', label: '評価額(JPY)', className: 'text-right' },
  { key: 'gain', label: '損益', className: 'text-right' },
];

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; broker?: string; sort?: string; dir?: string }>;
}) {
  const { type, q, broker, sort, dir } = await searchParams;
  const activeTab = TABS.some((t) => t.key === type) ? (type as AssetType | 'ALL') : 'ALL';
  const query = (q ?? '').trim();
  const activeBroker = (broker ?? '').trim();
  const sortKey: SortKey | null = sort === 'value' || sort === 'gain' ? sort : null;
  const sortDir: 'asc' | 'desc' = dir === 'asc' ? 'asc' : 'desc';

  const where = {
    ...(activeTab === 'ALL' ? {} : { type: activeTab }),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { ticker: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(activeBroker ? { broker: activeBroker } : {}),
  };

  const [assets, latestRate, brokerRows] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: { valuations: { orderBy: { valuedAt: 'desc' }, take: 1 } },
    }),
    prisma.exchangeRate.findFirst({ where: { pair: 'USDJPY' }, orderBy: { fetchedAt: 'desc' } }),
    prisma.asset.findMany({ where: { broker: { not: null } }, select: { broker: true }, distinct: ['broker'] }),
  ]);
  const usdJpyRate = latestRate ? Number(latestRate.rate) : 150;
  const typed = assets as unknown as AssetWithValuations[];
  const brokerOptions = brokerRows
    .map((r) => r.broker)
    .filter((b): b is string => !!b && b.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, 'ja'));

  const rows = typed.map((asset) => ({
    asset,
    value: calcAssetValueJpy(asset, usdJpyRate),
    distribution: calcAssetDistributionJpy(asset, usdJpyRate),
    gain: calcAssetGainJpy(asset, usdJpyRate),
    gainPercent: calcAssetGainPercent(asset, usdJpyRate),
    hasInfo: hasDistributionInfo(asset),
  }));

  if (sortKey) {
    const factor = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const av = sortKey === 'value' ? a.value : (a.gain ?? -Infinity);
      const bv = sortKey === 'value' ? b.value : (b.gain ?? -Infinity);
      return (av - bv) * factor;
    });
  }

  function sortHref(key: SortKey) {
    const params = new URLSearchParams();
    if (activeTab !== 'ALL') params.set('type', activeTab);
    if (query) params.set('q', query);
    if (activeBroker) params.set('broker', activeBroker);
    params.set('sort', key);
    params.set('dir', sortKey === key && sortDir === 'desc' ? 'asc' : 'desc');
    return `/assets?${params.toString()}`;
  }

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
        {TABS.map((t) => {
          const params = new URLSearchParams();
          if (t.key !== 'ALL') params.set('type', t.key);
          if (query) params.set('q', query);
          if (activeBroker) params.set('broker', activeBroker);
          if (sortKey) {
            params.set('sort', sortKey);
            params.set('dir', sortDir);
          }
          const qs = params.toString();
          return (
            <Link
              key={t.key}
              href={qs ? `/assets?${qs}` : '/assets'}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeTab === t.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <form method="GET" className="flex items-end gap-3 flex-wrap bg-white border rounded-lg p-3">
        {activeTab !== 'ALL' && <input type="hidden" name="type" value={activeTab} />}
        {sortKey && <input type="hidden" name="sort" value={sortKey} />}
        {sortKey && <input type="hidden" name="dir" value={sortDir} />}
        <div>
          <label htmlFor="q" className="block text-xs text-gray-400 mb-1">
            銘柄名・コードで検索
          </label>
          <Input id="q" name="q" defaultValue={query} placeholder="例: トヨタ / 7203" className="w-48" />
        </div>
        <div>
          <label htmlFor="broker" className="block text-xs text-gray-400 mb-1">
            証券会社で絞り込み
          </label>
          <select
            id="broker"
            name="broker"
            defaultValue={activeBroker}
            className="h-10 w-48 rounded-md border border-gray-300 px-3 text-sm text-gray-900"
          >
            <option value="">すべて</option>
            {brokerOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          絞り込む
        </Button>
        {(query || activeBroker) && (
          <Link
            href={activeTab === 'ALL' ? '/assets' : `/assets?type=${activeTab}`}
            className="text-sm text-blue-600 underline"
          >
            条件をクリア
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
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
                {SORTABLE.map((col) => (
                  <th key={col.key} className={`${col.className} px-4 py-2 font-medium`}>
                    <Link href={sortHref(col.key)} className="hover:text-gray-700 inline-flex items-center gap-0.5">
                      {col.label}
                      {sortKey === col.key && <span>{sortDir === 'desc' ? '▼' : '▲'}</span>}
                    </Link>
                  </th>
                ))}
                <th className="text-right px-4 py-2 font-medium">配当・分配金</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ asset, value, distribution, gain, gainPercent, hasInfo }) => {
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
                      {gain !== null ? (
                        <>
                          <div>{formatJpy(gain)}</div>
                          {gainPercent !== null && (
                            <div className="text-xs">
                              {gainPercent >= 0 ? '+' : ''}
                              {gainPercent.toFixed(1)}%
                            </div>
                          )}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!hasInfo ? (
                        <span className="text-gray-300">未入力</span>
                      ) : distribution > 0 ? (
                        <>
                          <div>{formatJpy(distribution)}</div>
                          {asset.distributionMonths.length > 0 && (
                            <div className="text-xs text-gray-400">
                              {asset.distributionMonths.map((m) => `${m}月`).join('・')}
                            </div>
                          )}
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
