'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface BenchmarkPoint {
  date: string;
  portfolioIndex: number | null;
  nikkeiIndex: number | null;
  topixIndex: number | null;
}

const RANGE_OPTIONS: { key: '1mo' | '6mo' | '1y'; label: string }[] = [
  { key: '1mo', label: '1ヶ月' },
  { key: '6mo', label: '6ヶ月' },
  { key: '1y', label: '1年' },
];

export function BenchmarkChart() {
  const [range, setRange] = useState<'1mo' | '6mo' | '1y'>('6mo');
  const [points, setPoints] = useState<BenchmarkPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPoints(null);
    fetch(`/api/portfolio/benchmark?range=${range}`)
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
        <span className="text-xs text-gray-400">評価額の記録がある日を基準日（100）とした相対推移</span>
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
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={points}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} minTickGap={30} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={50} tickFormatter={(v: number) => v.toFixed(0)} />
              <Tooltip formatter={(v, name) => [`${Number(v).toFixed(1)}`, name]} />
              <Legend />
              <Line
                type="monotone"
                dataKey="portfolioIndex"
                name="自分のポートフォリオ"
                stroke="#2563eb"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="nikkeiIndex"
                name="日経平均"
                stroke="#d97706"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="topixIndex"
                name="TOPIX連動ETF"
                stroke="#16a34a"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">
        ※ TOPIXは連動型ETF（1306.T）の値動きで代用しています。外貨建て資産の含み損益は為替の影響も含みます。
      </p>
    </div>
  );
}
