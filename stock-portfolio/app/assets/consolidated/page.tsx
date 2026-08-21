import Link from 'next/link';
import { prisma } from '@/lib/db/client';
import {
  buildConsolidatedGroups,
  ASSET_TYPE_LABEL,
  formatJpy,
  formatCurrency,
  type AssetWithValuations,
} from '@/lib/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function ConsolidatedAssetsPage() {
  const [assets, latestRate] = await Promise.all([
    prisma.asset.findMany({ include: { valuations: { orderBy: { valuedAt: 'desc' }, take: 1 } } }),
    prisma.exchangeRate.findFirst({ where: { pair: 'USDJPY' }, orderBy: { fetchedAt: 'desc' } }),
  ]);
  const usdJpyRate = latestRate ? Number(latestRate.rate) : 150;
  const typed = assets as unknown as AssetWithValuations[];
  const groups = buildConsolidatedGroups(typed, usdJpyRate);
  const splitGroups = groups.filter((g) => g.items.length > 1);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">銘柄別の合算ビュー</h1>
        <Link href="/assets" className="text-sm text-blue-600 underline">
          資産一覧に戻る
        </Link>
      </div>
      <p className="text-sm text-gray-500">
        同一銘柄が複数の証券会社に分かれて登録されている場合、合算した保有状況をここで確認できます。
      </p>

      {splitGroups.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900">
              {splitGroups.length}銘柄が複数の証券会社に分散しています（下記で強調表示）。
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <Card key={g.key} className={g.items.length > 1 ? 'border-amber-300' : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                {g.name}
                <Badge variant="outline">{ASSET_TYPE_LABEL[g.type]}</Badge>
                {g.items.length > 1 && (
                  <span className="text-xs font-normal text-amber-700">{g.items.length}口座に分散</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>
                  合計評価額: <span className="font-semibold text-gray-800">{formatJpy(g.totalValueJpy)}</span>
                </span>
                {g.totalQuantity !== null && <span>合計数量: {g.totalQuantity.toLocaleString('ja-JP')}</span>}
                {g.weightedAvgCost !== null && (
                  <span>
                    加重平均取得単価: {formatCurrency(g.weightedAvgCost, g.currency)}
                  </span>
                )}
              </div>
              {g.items.length > 1 && (
                <table className="w-full text-xs mt-2">
                  <thead className="text-gray-400">
                    <tr>
                      <th className="text-left font-normal py-1">証券会社</th>
                      <th className="text-right font-normal py-1">数量</th>
                      <th className="text-right font-normal py-1">評価額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="py-1">
                          <Link href={`/assets/${item.id}`} className="text-blue-700 hover:underline">
                            {item.broker || '未設定'}
                          </Link>
                        </td>
                        <td className="text-right py-1">{item.quantity?.toLocaleString('ja-JP') ?? '-'}</td>
                        <td className="text-right py-1">{formatJpy(item.valueJpy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
