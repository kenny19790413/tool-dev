'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatJpy } from '@/lib/portfolio';

interface HistoryPoint {
  date: string;
  totalValueJpy: number;
}

const RANGE_OPTIONS: { key: '1mo' | '6mo' | '1y'; label: string }[] = [
  { key: '1mo', label: '1ヶ月' },
  { key: '6mo', label: '6ヶ月' },
  { key: '1y', label: '1年' },
];

export function PortfolioValueChart() {
  const [range, setRange] = useState<'1mo' | '6mo' | '1y'>('6mo');
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

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">「株価を更新」を実行するたびに記録されます</span>
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

      {!points && <p className="text-sm text-gray-400">読み込み中…</p>}
      {points && points.length < 2 && (
        <p className="text-sm text-gray-400">
          データがまだ十分にありません。「株価を更新」を数日にわたって実行すると、推移が表示されます。
        </p>
      )}
      {points && points.length >= 2 && (
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={points}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} minTickGap={30} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => formatJpy(v)} />
              <Tooltip formatter={(v) => [formatJpy(Number(v)), '評価額']} />
              <Line type="monotone" dataKey="totalValueJpy" stroke="#2563eb" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
