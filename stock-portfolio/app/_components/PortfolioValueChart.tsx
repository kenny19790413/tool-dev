'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatJpy } from '@/lib/portfolio';

interface HistoryPoint {
  date: string;
  totalValueJpy: number;
  totalGainJpy: number | null;
}

const RANGE_OPTIONS: { key: '1mo' | '6mo' | '1y'; label: string }[] = [
  { key: '1mo', label: '1ヶ月' },
  { key: '6mo', label: '6ヶ月' },
  { key: '1y', label: '1年' },
];

const METRIC_OPTIONS: { key: 'value' | 'gain'; label: string }[] = [
  { key: 'value', label: '評価額' },
  { key: 'gain', label: '含み損益' },
];

export function PortfolioValueChart() {
  const [range, setRange] = useState<'1mo' | '6mo' | '1y'>('6mo');
  const [metric, setMetric] = useState<'value' | 'gain'>('value');
  const [points, setPoints] = useState<HistoryPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPoints(null);
    fetch(`/api/portfolio/history?range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setPoints(data.points ?? []);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const dataKey = metric === 'value' ? 'totalValueJpy' : 'totalGainJpy';
  const validPoints = points?.filter((p) => p[dataKey] !== null) ?? null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex gap-1">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMetric(opt.key)}
              className={`px-2 py-1 rounded text-xs border transition-colors ${
                metric === opt.key
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
      </div>
      <p className="text-xs text-gray-400 mb-2">「株価を更新」を実行するたびに記録されます</p>

      {!points && <p className="text-sm text-gray-400">読み込み中…</p>}
      {points && (validPoints?.length ?? 0) < 2 && (
        <p className="text-sm text-gray-400">
          データがまだ十分にありません。「株価を更新」を数日にわたって実行すると、推移が表示されます。
        </p>
      )}
      {validPoints && validPoints.length >= 2 && (
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={validPoints}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} minTickGap={30} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => formatJpy(v)} />
              <Tooltip formatter={(v) => [formatJpy(Number(v)), metric === 'value' ? '評価額' : '含み損益']} />
              {metric === 'gain' && <ReferenceLine y={0} stroke="#d1d5db" />}
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={metric === 'value' ? '#2563eb' : '#16a34a'}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
