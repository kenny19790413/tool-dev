import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Term } from '../_components/Term';
import { formatJpy, formatCurrency } from '@/lib/portfolio';
import { DEMO_ASSETS, demoValueJpy, demoGainJpy } from '@/lib/demoData';
import { GLOSSARY } from '@/lib/glossary';

export const dynamic = 'force-static';

export default function DemoPage() {
  const totalValue = DEMO_ASSETS.reduce((sum, a) => sum + demoValueJpy(a), 0);
  const totalGain = DEMO_ASSETS.reduce((sum, a) => sum + demoGainJpy(a), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">サンプルポートフォリオで体験してみましょう</h1>
        <p className="text-sm text-gray-500 mt-1">
          株式投資が初めての方向けに、架空のデータでこのアプリの見方を説明します。実際に自分の資産を登録するには
          <Link href="/login" className="text-blue-600 underline">
            ログイン
          </Link>
          してください。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-500">総資産（サンプル）</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-800">{formatJpy(totalValue)}</p>
            <p className="text-xs text-gray-400 mt-1">保有しているすべての資産を、今の価格で評価した合計額です。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-gray-500">
              <Term slug="unrealized-gain">含み損益</Term>（サンプル）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatJpy(totalGain)}
            </p>
            <p className="text-xs text-gray-400 mt-1">買った時の値段と今の値段の差から計算した、未確定の損益です。</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">保有資産の一覧（サンプル）</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-500 border-b">
              <tr>
                <th className="text-left font-medium py-2">銘柄</th>
                <th className="text-right font-medium py-2">数量</th>
                <th className="text-right font-medium py-2">
                  <Term slug="avg-cost">取得単価</Term>
                </th>
                <th className="text-right font-medium py-2">現在値</th>
                <th className="text-right font-medium py-2">評価額</th>
                <th className="text-right font-medium py-2">含み損益</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_ASSETS.map((a) => {
                const gain = demoGainJpy(a);
                return (
                  <tr key={a.name} className="border-b last:border-0">
                    <td className="py-2">
                      {a.name}
                      <span className="ml-1 text-xs text-gray-400">（{a.type}）</span>
                    </td>
                    <td className="py-2 text-right">{a.quantity.toLocaleString('ja-JP')}</td>
                    <td className="py-2 text-right">{formatCurrency(a.avgCost, a.currency)}</td>
                    <td className="py-2 text-right">{formatCurrency(a.currentPrice, a.currency)}</td>
                    <td className="py-2 text-right font-medium">{formatJpy(demoValueJpy(a))}</td>
                    <td className={`py-2 text-right ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatJpy(gain)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">投資の基本用語</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {GLOSSARY.slice(0, 5).map((entry) => (
            <div key={entry.slug}>
              <p className="text-sm font-medium text-gray-800">{entry.term}</p>
              <p className="text-sm text-gray-600">{entry.definition}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4 space-y-2 text-center">
          <p className="text-sm text-blue-900">実際に自分の資産を登録・管理してみましょう。</p>
          <Button asChild>
            <Link href="/login">ログインして始める</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
