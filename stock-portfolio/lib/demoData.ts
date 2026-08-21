// ゲスト向けデモページ専用の架空データ。実データベースには一切アクセスしない（Prismaをimportしない）。
export interface DemoAsset {
  name: string;
  type: '単株' | '投資信託';
  quantity: number;
  avgCost: number;
  currentPrice: number;
  currency: 'JPY' | 'USD';
}

export const DEMO_ASSETS: DemoAsset[] = [
  { name: 'サンプル商事株式会社', type: '単株', quantity: 300, avgCost: 1800, currentPrice: 2150, currency: 'JPY' },
  { name: 'デモテクノロジーズ', type: '単株', quantity: 100, avgCost: 4200, currentPrice: 3950, currency: 'JPY' },
  { name: '架空フーズホールディングス', type: '単株', quantity: 500, avgCost: 980, currentPrice: 1120, currency: 'JPY' },
  { name: 'Example Global Fund', type: '投資信託', quantity: 200000, avgCost: 11500, currentPrice: 12800, currency: 'JPY' },
];

export function demoValueJpy(a: DemoAsset): number {
  if (a.type === '投資信託') return (a.currentPrice / 10000) * a.quantity;
  return a.currentPrice * a.quantity;
}

export function demoGainJpy(a: DemoAsset): number {
  if (a.type === '投資信託') return ((a.currentPrice - a.avgCost) / 10000) * a.quantity;
  return (a.currentPrice - a.avgCost) * a.quantity;
}
