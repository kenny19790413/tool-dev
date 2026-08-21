import type { Asset, Valuation } from '@prisma/client';

export interface AssetWithValuations extends Asset {
  valuations: Valuation[]; // valuedAt desc でソート済みであること（[0]が最新）
}

type DecimalLike = { toNumber: () => number } | number | null | undefined;

export function toNumber(v: DecimalLike): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : v.toNumber();
}

// 投資信託の基準価額は「1万口あたり」の金額で表示される慣習
export const FUND_NAV_UNIT = 10000;

// 配当・分配金にかかる源泉徴収税率（個人・申告分離課税を想定：所得税15.315%+住民税5% = 20.315%）
// NISA口座等の非課税分は考慮していない概算値。個人保有分はこの税率で課税関係が完結するため「手取り」を計算できる。
export const DIVIDEND_TAX_RATE = 0.20315;

export function calcAfterTaxAmount(grossAmount: number): number {
  return grossAmount * (1 - DIVIDEND_TAX_RATE);
}

// 法人が受け取る配当・分配金の源泉徴収税率（所得税15.315%のみ、住民税の源泉徴収なし）。
// これは法人税の前払いであり法人税額から控除されるため、個人と違って「手取り」を単純計算できない。
// 最終的な税負担は益金不算入割合（株式の保有区分による）や法人全体の所得水準によって変わるため、
// このアプリでは源泉徴収額の参考表示にとどめ、法人の「税引後手取り」は計算しない。
export const CORPORATE_WITHHOLDING_RATE = 0.15315;

export function calcCorporateWithholding(grossAmount: number): number {
  return grossAmount * CORPORATE_WITHHOLDING_RATE;
}

export const ASSET_OWNER_TYPE_LABEL: Record<'INDIVIDUAL' | 'CORPORATE', string> = {
  INDIVIDUAL: '個人',
  CORPORATE: '法人',
};

// アナリスト目標株価に対する上昇/下落余地（%）。currentPrice/targetMeanPriceが揃わない場合はnull。
// Yahoo Financeの目標株価は通常「今後12ヶ月」を想定した見通し。
export function calcUpsidePercent(currentPrice: number, targetMeanPrice: number): number | null {
  if (!currentPrice || !Number.isFinite(currentPrice)) return null;
  return ((targetMeanPrice - currentPrice) / currentPrice) * 100;
}

// 現在値の自動取得に対応する資産種別（STOCK=株価、FUND=基準価額）
export function hasAutoPrice(type: Asset['type']): boolean {
  return type === 'STOCK' || type === 'FUND';
}

// 資産1件の現在評価額（JPY換算）
export function calcAssetValueJpy(asset: AssetWithValuations, usdJpyRate: number): number {
  if (asset.type === 'STOCK') {
    const valueInCurrency = toNumber(asset.currentPrice) * toNumber(asset.quantity);
    return asset.currency === 'USD' ? valueInCurrency * usdJpyRate : valueInCurrency;
  }
  if (asset.type === 'FUND') {
    return (toNumber(asset.currentPrice) / FUND_NAV_UNIT) * toNumber(asset.quantity);
  }
  const latest = asset.valuations[0];
  if (!latest) return 0;
  const valueInCurrency = toNumber(latest.value);
  return asset.currency === 'USD' ? valueInCurrency * usdJpyRate : valueInCurrency;
}

// 分配金・配当情報が入力/取得済みか（STOCKは自動取得値、それ以外は手動入力値の有無で判定）
export function hasDistributionInfo(asset: Asset): boolean {
  if (asset.type === 'STOCK') return asset.dividendPerShare !== null && asset.dividendPerShare !== undefined;
  return asset.annualDistribution !== null && asset.annualDistribution !== undefined;
}

// 分配金・配当情報が未入力で、かつ「警告すべき状態」かどうか。
// 決算月が判明していない資産は常に対象。決算月が判明している資産は、
// 今年その決算月を迎える（＝もう過ぎている）まではまだ未入力でも警告しない。
export function isDistributionInfoOverdue(asset: Asset, today: Date = new Date()): boolean {
  if (hasDistributionInfo(asset)) return false;
  if (asset.distributionMonths.length === 0) return true;
  const currentMonth = today.getMonth() + 1;
  return asset.distributionMonths.some((m) => m <= currentMonth);
}

// 資産1件の年間配当・分配金見込み（JPY換算、概算値）
// STOCK: 自動取得の1株配当×数量。BOND/FUND/PRIVATE: 手動入力した年間分配金総額
export function calcAssetDistributionJpy(asset: AssetWithValuations, usdJpyRate: number): number {
  const amount =
    asset.type === 'STOCK'
      ? toNumber(asset.dividendPerShare) * toNumber(asset.quantity)
      : toNumber(asset.annualDistribution);
  return asset.currency === 'USD' ? amount * usdJpyRate : amount;
}

// 全資産の配当・分配金を「支払い月」ごとに集計（JPY換算）。
// distributionMonths未設定（空配列）の資産はどの月にも計上せず、月別合計とは別に「入金月未設定の年間見込み額」として返す。
export function calcMonthlyDistributionJpy(
  assets: AssetWithValuations[],
  usdJpyRate: number
): { monthly: number[]; unscheduled: number } {
  const monthly = Array(12).fill(0) as number[];
  let unscheduled = 0;
  for (const asset of assets) {
    const annual = calcAssetDistributionJpy(asset, usdJpyRate);
    if (annual <= 0) continue;
    const months = asset.distributionMonths;
    if (months.length === 0) {
      unscheduled += annual;
      continue;
    }
    const perMonth = annual / months.length;
    for (const m of months) monthly[m - 1] += perMonth;
  }
  return { monthly, unscheduled };
}

// 資産1件の含み損益（JPY換算、株・投資信託でavgCost入力時のみ）
export function calcAssetGainJpy(asset: AssetWithValuations, usdJpyRate: number): number | null {
  if (asset.avgCost === null || asset.avgCost === undefined) return null;
  if (asset.type === 'STOCK') {
    const gainInCurrency = (toNumber(asset.currentPrice) - toNumber(asset.avgCost)) * toNumber(asset.quantity);
    return asset.currency === 'USD' ? gainInCurrency * usdJpyRate : gainInCurrency;
  }
  if (asset.type === 'FUND') {
    return ((toNumber(asset.currentPrice) - toNumber(asset.avgCost)) / FUND_NAV_UNIT) * toNumber(asset.quantity);
  }
  return null;
}

// 資産1件の含み損益率（%）。avgCost未入力または取得コストが0の場合はnull。
export function calcAssetGainPercent(asset: AssetWithValuations, usdJpyRate: number): number | null {
  const gain = calcAssetGainJpy(asset, usdJpyRate);
  if (gain === null) return null;
  const value = calcAssetValueJpy(asset, usdJpyRate);
  const cost = value - gain;
  if (cost === 0) return null;
  return (gain / cost) * 100;
}

// ポートフォリオ全体の含み損益。avgCost未入力の資産（BOND/PRIVATEなど）は集計から除外し、件数を別途返す。
export function calcPortfolioGain(
  assets: AssetWithValuations[],
  usdJpyRate: number
): { gain: number; percent: number | null; trackedCount: number; untrackedCount: number } {
  let gain = 0;
  let cost = 0;
  let trackedCount = 0;
  let untrackedCount = 0;
  for (const asset of assets) {
    const assetGain = calcAssetGainJpy(asset, usdJpyRate);
    if (assetGain === null) {
      untrackedCount++;
      continue;
    }
    trackedCount++;
    gain += assetGain;
    cost += calcAssetValueJpy(asset, usdJpyRate) - assetGain;
  }
  const percent = cost !== 0 ? (gain / cost) * 100 : null;
  return { gain, percent, trackedCount, untrackedCount };
}

// 銘柄名の名寄せ用に、全角英数字を半角化した上で空白・括弧類を除去
function normalizeAssetName(name: string): string {
  return name.normalize('NFKC').replace(/[\s()（）【】[\]]/g, '');
}

export interface ConsolidatedGroupItem {
  id: number;
  name: string;
  broker: string | null;
  quantity: number | null;
  valueJpy: number;
}

export interface ConsolidatedGroup {
  key: string;
  name: string;
  type: Asset['type'];
  currency: string;
  totalQuantity: number | null;
  totalValueJpy: number;
  weightedAvgCost: number | null;
  items: ConsolidatedGroupItem[];
}

// 同一銘柄が複数の証券会社に分散している場合、合算した保有状況を確認できるようグループ化する。
// STOCK/FUNDはtickerで、それ以外は正規化した名前でグループ化する（tickerの方が信頼できるため優先）。
export function buildConsolidatedGroups(assets: AssetWithValuations[], usdJpyRate: number): ConsolidatedGroup[] {
  const groups = new Map<string, ConsolidatedGroup>();

  for (const asset of assets) {
    const key = asset.ticker ? `ticker:${asset.ticker}` : `name:${asset.type}:${normalizeAssetName(asset.name)}`;
    const valueJpy = calcAssetValueJpy(asset, usdJpyRate);
    const quantity = hasAutoPrice(asset.type) ? toNumber(asset.quantity) : null;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: asset.name,
        type: asset.type,
        currency: asset.currency,
        totalQuantity: quantity !== null ? 0 : null,
        totalValueJpy: 0,
        weightedAvgCost: null,
        items: [],
      };
      groups.set(key, group);
    }
    group.totalValueJpy += valueJpy;
    if (quantity !== null && group.totalQuantity !== null) group.totalQuantity += quantity;
    group.items.push({ id: asset.id, name: asset.name, broker: asset.broker, quantity, valueJpy });
  }

  for (const group of groups.values()) {
    const assetsInGroup = assets.filter((a) => group.items.some((it) => it.id === a.id));
    const allHaveCost = assetsInGroup.length > 0 && assetsInGroup.every((a) => a.avgCost !== null);
    if (allHaveCost && group.totalQuantity && group.totalQuantity > 0) {
      const totalCost = assetsInGroup.reduce((sum, a) => sum + toNumber(a.avgCost) * toNumber(a.quantity), 0);
      const totalQty = assetsInGroup.reduce((sum, a) => sum + toNumber(a.quantity), 0);
      group.weightedAvgCost = totalQty > 0 ? totalCost / totalQty : null;
    }
  }

  return [...groups.values()].sort((a, b) => b.totalValueJpy - a.totalValueJpy);
}

// Yahoo Financeのアナリスト推奨度キー → 日本語ラベル
export const RECOMMENDATION_LABEL: Record<string, string> = {
  strong_buy: '強気買い',
  buy: '買い',
  outperform: 'やや買い',
  hold: '中立',
  underperform: 'やや売り',
  sell: '売り',
  strong_sell: '強気売り',
  none: '不明',
};

export const ASSET_TYPE_LABEL: Record<Asset['type'], string> = {
  STOCK: '単株',
  BOND: '債券',
  FUND: '投資信託',
  PRIVATE: 'プライベート資産',
};

export const MARKET_LABEL: Record<'JP' | 'US', string> = {
  JP: '日本株',
  US: '米国株',
};

export function formatJpy(n: number): string {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

export function formatCurrency(n: number, currency: string): string {
  if (currency === 'USD') return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return formatJpy(n);
}
