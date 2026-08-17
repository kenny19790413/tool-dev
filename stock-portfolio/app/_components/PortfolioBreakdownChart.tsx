'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatJpy } from '@/lib/portfolio';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#dc2626'];

interface BreakdownItem {
  type: string;
  label: string;
  value: number;
  count: number;
}

export function PortfolioBreakdownChart({ data }: { data: BreakdownItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatJpy(Number(v))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {data.map((d, i) => (
            <tr key={d.type} className="border-b last:border-0">
              <td className="py-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                {d.label}（{d.count}件）
              </td>
              <td className="py-2 text-right font-medium">{formatJpy(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
