'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PricePoint {
  date: string;
  close: number;
}

const RANGE_OPTIONS: { key: '1mo' | '6mo' | '1y'; label: string }[] = [
  { key: '1mo', label: '1ヶ月' },
  { key: '6mo', label: '6ヶ月' },
  { key: '1y', label: '1年' },
];

export function PriceHistoryChart({ assetId, currency }: { assetId: number; currency: string }) {
  const [range, setRange] = useState<'1mo' | '6mo' | '1y'>('6mo');
  const [points, setPoints] = useState<PricePoint[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setPoints(null);
    setError('');
    fetch(`/api/assets/${assetId}/price-history?range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setPoints(data.points);
      })
      .catch(() => {
        if (!cancelled) setError('価格推移の取得に失敗しました');
      });
    return () => {
      cancelled = true;
    };
  }, [assetId, range]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">価格の推移（実績）</CardTitle>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRange(opt.key)}
              className={`px-2 py-1 rounded text-xs border transition-colors ${
                range === opt.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-gray-400">{error}</p>}
        {!error && !points && <p className="text-sm text-gray-400">読み込み中…</p>}
        {!error && points && points.length > 0 && (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={points}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  minTickGap={30}
                />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString('ja-JP')} ${currency}`, '終値']} />
                <Line type="monotone" dataKey="close" stroke="#2563eb" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">※ 過去の実際の値動きです。将来の値動きを示すものではありません。</p>
      </CardContent>
    </Card>
  );
}
