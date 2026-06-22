// 日付を YYYY-MM-DD 文字列に変換
function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// 営業日計算（土日＋祝日・休業日除外）
export function addBusinessDays(startDate: Date, days: number, holidaySet: Set<string> = new Set()): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    const ymd = toYMD(result);
    if (dow !== 0 && dow !== 6 && !holidaySet.has(ymd)) added++;
  }
  return result;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  type: 'public' | 'company';
}

export function buildHolidaySet(holidays: Holiday[]): Set<string> {
  return new Set(holidays.map((h) => h.date.slice(0, 10)));
}

export interface ProductionDayMaster {
  process_type: string;
  quantity_min: number;
  quantity_max: number | null;
  days: number;
}

// 工程ごとの必要日数を取得
export function getProcessDays(
  masters: ProductionDayMaster[],
  processType: string,
  quantity: number
): number {
  const match = masters.find(
    (m) =>
      m.process_type === processType &&
      quantity >= m.quantity_min &&
      (m.quantity_max == null || quantity <= m.quantity_max)
  );
  return match?.days ?? 1;
}

// 全工程の合計営業日数を計算
export function calcTotalDays(
  masters: ProductionDayMaster[],
  processTypes: string[],
  quantity: number
): number {
  // 印刷は常に含む
  const allProcesses = ['print', ...processTypes];
  return allProcesses.reduce((sum, pt) => sum + getProcessDays(masters, pt, quantity), 0);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
}
