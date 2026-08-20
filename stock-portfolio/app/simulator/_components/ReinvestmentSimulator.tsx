'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatJpy } from '@/lib/portfolio';

export function ReinvestmentSimulator({
  initialValue,
  initialYieldRate,
}: {
  initialValue: number;
  initialYieldRate: number;
}) {
  const [years, setYears] = useState(10);
  const [growthRatePercent, setGrowthRatePercent] = useState(0);

  const annualRate = growthRatePercent / 100 + initialYieldRate;
  const points: { year: number; value: number }[] = [];
  let value = initialValue;
  points.push({ year: 0, value });
  for (let y = 1; y <= years; y++) {
    value = value * (1 + annualRate);
    points.push({ year: y, value });
  }
  const finalValue = points[points.length - 1].value;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">前提条件</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="years">シミュレーション年数</Label>
            <Input
              id="years"
              type="number"
              min="1"
              max="50"
              value={years}
              onChange={(e) => setYears(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="mt-1 w-28"
            />
          </div>
          <div>
            <Label htmlFor="growth">想定の年間価格成長率（%）</Label>
            <Input
              id="growth"
              type="number"
              step="0.1"
              value={growthRatePercent}
              onChange={(e) => setGrowthRatePercent(Number(e.target.value) || 0)}
              className="mt-1 w-28"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">試算結果</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            {years}年後の推定評価額: <span className="text-xl font-bold text-blue-700">{formatJpy(finalValue)}</span>
          </p>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={points}>
                <XAxis dataKey="year" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}年後`} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => formatJpy(v)} />
                <Tooltip formatter={(v) => [formatJpy(Number(v)), '推定評価額']} labelFormatter={(v) => `${v}年後`} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" dot={false} strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            ※ あくまで単純化した試算です。現在の配当・分配金の利回り（税引後・源泉徴収後ベース）と入力した価格成長率が今後も一定に続くと仮定した複利計算で、実際の株価・配当は変動します。NISA枠や新規入金は考慮していません。
          </p>
        </CardContent>
      </Card>
    </>
  );
}
