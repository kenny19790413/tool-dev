'use client';

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface QuantityRow {
  id: number;
  quantity: number;
  actual_sheets: number;
  waste_sheets: number;
  total_sheets: number;
  passes: number;
  paper_cost: number;
  plate_cost: number;
  print_cost: number;
  ink_cost: number;
  cutting_cost: number;
  press_cost: number;
  pp_cost: number;
  emboss_cost: number;
  foil_cost: number;
  lamination_cost: number;
  corrugated_cost: number;
  thomson_cost: number;
  binding_cost: number;
  packing_cost: number;
  delivery_cost: number;
  outsource_cost: number;
  subtotal: number;
  overhead_amount: number;
  total: number;
  unit_price: number;
}

interface ComparePanelProps {
  quantities: QuantityRow[];
  overheadRate: number;
}

// 印刷機の標準速度（通し/時間）と段取り固定時間
const PRINT_SPEED = 8000;
const SETUP_HOURS = 1;

const fmt = (n: number) => Math.round(Number(n)).toLocaleString('ja-JP');

const fmtTime = (h: number) => {
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
};

const processingTotal = (q: QuantityRow) =>
  Number(q.cutting_cost) + Number(q.press_cost) + Number(q.pp_cost) +
  Number(q.emboss_cost) + Number(q.foil_cost) + Number(q.lamination_cost) +
  Number(q.corrugated_cost) + Number(q.thomson_cost) + Number(q.binding_cost) +
  Number(q.packing_cost) + Number(q.delivery_cost) + Number(q.outsource_cost);

function EfficiencyBar({ value }: { value: number }) {
  const color =
    value >= 90 ? 'bg-green-500' :
    value >= 70 ? 'bg-blue-500' :
    'bg-gray-300';
  const textColor =
    value >= 90 ? 'text-green-600' :
    value >= 70 ? 'text-blue-600' :
    'text-gray-500';
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-16 bg-gray-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-medium w-10 text-right ${textColor}`}>
        {value}%
      </span>
    </div>
  );
}

export function ComparePanel({ quantities, overheadRate }: ComparePanelProps) {
  if (quantities.length < 2) return null;

  const sorted = [...quantities].sort(
    (a, b) => Number(a.quantity) - Number(b.quantity)
  );

  const minUnitPrice = Math.min(...sorted.map((q) => Number(q.unit_price)));

  const rows = sorted.map((q, i) => {
    const prevQ = i > 0 ? sorted[i - 1] : null;
    const marginalCost =
      prevQ != null
        ? Math.round(
            ((Number(q.total) - Number(prevQ.total)) /
              (Number(q.quantity) - Number(prevQ.quantity))) * 10
          ) / 10
        : null;
    const printHours = SETUP_HOURS + Number(q.passes) / PRINT_SPEED;
    const efficiency = Math.round((minUnitPrice / Number(q.unit_price)) * 100);
    const fixedRate =
      Math.round((Number(q.plate_cost) / Number(q.total)) * 1000) / 10;
    const isMin = Math.abs(Number(q.unit_price) - minUnitPrice) < 0.1;

    return {
      label: `${Number(q.quantity).toLocaleString()}部`,
      quantity: Number(q.quantity),
      unitPrice: Math.round(Number(q.unit_price) * 10) / 10,
      total: Number(q.total),
      paperCost: Number(q.paper_cost),
      plateCost: Number(q.plate_cost),
      printCost: Math.round(Number(q.print_cost) + Number(q.ink_cost)),
      processCost: Math.round(processingTotal(q)),
      overheadAmt: Number(q.overhead_amount),
      marginalCost,
      fixedRate,
      efficiency,
      passes: Number(q.passes),
      printHours: Math.round(printHours * 10) / 10,
      throughput: Math.round(Number(q.quantity) / printHours),
      isMin,
    };
  });

  const yTickFmt = (v: number) => `¥${(v / 1000).toFixed(0)}k`;

  return (
    <div className="space-y-5 mt-4 pt-4 border-t border-dashed">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        比較分析
      </p>

      {/* グラフ2列 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 単価推移 */}
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs font-medium text-gray-600 mb-3">単価推移（円/部）</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `¥${Number(v).toLocaleString()}`}
                width={70}
              />
              <Tooltip
                formatter={(v) => [`¥${Number(v ?? 0).toLocaleString()}`, '単価']}
              />
              <Line
                type="monotone"
                dataKey="unitPrice"
                name="単価"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 費目内訳 */}
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs font-medium text-gray-600 mb-3">費目内訳（円）</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={yTickFmt} width={50} />
              <Tooltip
                formatter={(v, name) => [
                  `¥${Math.round(Number(v ?? 0)).toLocaleString()}`,
                  String(name),
                ]}
              />
              <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="paperCost"  name="用紙費" stackId="a" fill="#60a5fa" />
              <Bar dataKey="plateCost"  name="版代"   stackId="a" fill="#f59e0b" />
              <Bar dataKey="printCost"  name="印刷費" stackId="a" fill="#34d399" />
              <Bar dataKey="processCost" name="加工費" stackId="a" fill="#a78bfa" />
              <Bar dataKey="overheadAmt" name="経費"   stackId="a" fill="#fb923c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 効率比較テーブル */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-700">効率比較</p>
          <p className="text-xs text-gray-400">
            推定印刷時間 = 段取り1h + 通し数÷{PRINT_SPEED.toLocaleString()}通し/h
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50 border-b">
                <th className="px-4 py-2 text-left">数量</th>
                <th className="px-4 py-2 text-right">合計</th>
                <th className="px-4 py-2 text-right">単価</th>
                <th className="px-4 py-2 text-right min-w-[120px]">
                  コスト効率
                </th>
                <th className="px-4 py-2 text-right">増部単価</th>
                <th className="px-4 py-2 text-right">固定費率</th>
                <th className="px-4 py-2 text-right">通し数</th>
                <th className="px-4 py-2 text-right">印刷時間</th>
                <th className="px-4 py-2 text-right">生産性</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b last:border-0 ${
                    row.isMin ? 'bg-green-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium">
                    {row.label}
                    {row.isMin && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-normal">
                        最安
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700 font-medium">
                    ¥{fmt(row.total)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ¥{row.unitPrice.toFixed(1)}
                  </td>
                  <td className="px-4 py-3">
                    <EfficiencyBar value={row.efficiency} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {row.marginalCost !== null ? (
                      `¥${row.marginalCost.toFixed(1)}`
                    ) : (
                      <span className="text-gray-300 text-xs">基準</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        row.fixedRate > 30 ? 'text-amber-600 font-medium' : 'text-gray-600'
                      }
                    >
                      {row.fixedRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {row.passes.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {fmtTime(row.printHours)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {row.throughput.toLocaleString()}部/h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
