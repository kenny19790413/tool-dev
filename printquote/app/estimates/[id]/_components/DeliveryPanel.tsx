'use client';

import { addBusinessDays, buildHolidaySet, calcTotalDays, formatDate } from '@/lib/delivery';
import type { Holiday, ProductionDayMaster } from '@/lib/delivery';

interface Props {
  processTypes: string[];
  quantities: number[];
  createdAt: string;
  masters: ProductionDayMaster[];
  holidays: Holiday[];
}

const PROCESS_LABEL: Record<string, string> = {
  print: '印刷', cutting: '断裁', pp: 'PP加工', press: 'プレス',
  emboss: 'エンボス', foil: '箔押し', lamination: '合紙',
  corrugated: '片段合紙', thomson: 'トムソン', binding: '製本', packing: '梱包・納品',
};

export function DeliveryPanel({ processTypes, quantities, createdAt, masters, holidays }: Props) {
  if (quantities.length === 0) return null;

  const startDate = new Date(createdAt);
  const holidaySet = buildHolidaySet(holidays);

  return (
    <div className="space-y-3">
      {quantities.map((qty) => {
        const totalDays = calcTotalDays(masters, processTypes, qty);
        const deliveryDate = addBusinessDays(startDate, totalDays, holidaySet);
        const allProcesses = ['print', ...processTypes];

        return (
          <div key={qty} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-sm">{qty.toLocaleString()}部</span>
              <span className="text-blue-700 font-bold">
                合計 {totalDays} 営業日 → {formatDate(deliveryDate)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allProcesses.map((pt) => {
                const days = masters.find(
                  (m) =>
                    m.process_type === pt &&
                    qty >= m.quantity_min &&
                    (m.quantity_max == null || qty <= m.quantity_max)
                )?.days;
                if (!days) return null;
                return (
                  <span key={pt} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {PROCESS_LABEL[pt] ?? pt}: {days}日
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-gray-400">
        ※ 起票日（{startDate.toLocaleDateString('ja-JP')}）から土日・祝日・休業日を除いた営業日で計算。
      </p>
    </div>
  );
}
