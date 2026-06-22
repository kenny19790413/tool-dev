// ============================================================
// PrintQuote 計算エンジン — 型定義
// ============================================================

export type ProductType = 'thick' | 'thin';         // 厚物 / 薄物
export type CoaterType = 'none' | 'single' | 'double';
export type ColorType = 'process' | 'special';
export type ProcessType =
  | 'cutting'     // 断裁
  | 'press'       // プレス（ニス引き）
  | 'pp'          // PP加工
  | 'emboss'      // エンボス
  | 'foil'        // 箔押し
  | 'lamination'  // 合紙
  | 'corrugated'  // 片段合紙
  | 'thomson'     // トムソン
  | 'binding'     // 製本
  | 'packing'     // 梱包
  | 'delivery'    // 納品
  | 'other';

// ── マスタデータ型（DBから取得したデータ） ──────────────────

export interface PaperMaster {
  id: number;
  number: number;
  name: string;
  parentSize: string;
  widthMm: number;
  heightMm: number;
  reamWeight: number;           // 連量(kg)
  unitPrice: number | null;     // ㎏単価（円/kg）— nullの場合はsheetPriceを使用
  sheetPrice: number | null;    // 枚単価（円/枚）— nullの場合はunitPriceを使用
  lowVolPrice: number | null;   // 少量割増単価
  rate: number;                 // 掛け率(%)
}

export interface PrintPriceMaster {
  colorType: ColorType;
  minSheets: number;
  maxSheets: number | null;    // null = 上限なし
  unitPrice: number;           // 1色あたり通し単価（円/通し）
}

export interface ProcessingPriceMaster {
  processType: ProcessType;
  productType: ProductType | null; // null = 厚物/薄物共通
  threshold: number;           // 固定費 → 従量費 切り替え通し数（枚数）
  fixedPrice: number;          // 閾値以下の固定費
  coeffA: number | null;       // 従量単価 = 面積(m²) × A + B 円/通し
  coeffB: number | null;
  perSheetPrice: number | null; // 枚数×単価型（断裁の従量帯等）
}

export interface DieMoldMaster {
  id: number;
  moldCode: string;
  faces: number;
  complexity: number;          // 1〜5
  baseMoldCost: number;        // 保管型は0、新規は複雑度テーブルから算出
}

// 木型単価テーブル（複雑度 1〜5 → 円/面）
export type MoldUnitPriceTable = Record<number, number>;

// ── 計算エンジンへの入力 ──────────────────────────────────

export interface CalcInput {
  // 製品仕様
  productType: ProductType;
  finishWidthMm: number;
  finishHeightMm: number;
  faces: number;               // 丁付け数
  cuts: number;                // 切数
  frontColors: number;         // 表度数
  backColors: number;          // 裏度数
  coater: CoaterType;
  colorType: ColorType;
  wasteRate: number;           // ヤレ率(%)
  hasThomson: boolean;

  // 型・版
  hasMold: boolean;
  moldData: DieMoldMaster | null;   // 型あり → 参照
  moldComplexity: number;            // 型なし → 複雑度入力（1〜5）
  moldUnitPriceTable: MoldUnitPriceTable;

  // 有効な加工リスト（選択した加工のみ計算）
  processTypes: ProcessType[];

  // 数量
  quantity: number;

  // マスタデータ（事前にDBから取得して渡す）
  paper: PaperMaster;
  printPriceMasters: PrintPriceMaster[];
  processingPriceMasters: ProcessingPriceMaster[];

  // 合計計算
  overheadRate: number;        // 営業経費率(%)

  // 外注費（加工種別ごとに手入力）
  outsourceCosts?: Partial<Record<ProcessType, number>>;

  // 箔押し単価（手入力 or マスタ）
  foilUnitPrice?: number;

  // 梱包・納品（手入力）
  packingCost?: number;
  deliveryCost?: number;
}

// ── 計算結果 ──────────────────────────────────────────────

export interface CalcIntermediate {
  actualSheets: number;        // 実枚数（親判）
  wasteSheets: number;         // ヤレ枚数
  totalSheets: number;         // 全紙数（50枚単位切り上げ済み）
  passes: number;              // 通し数（quantity / faces / cuts）
}

export interface CalcCostBreakdown {
  paperCost: number;
  plateCost: number;
  printCost: number;
  inkCost: number;
  cuttingCost: number;
  pressCost: number;
  ppCost: number;
  embossCost: number;
  foilCost: number;
  laminationCost: number;
  corrugatedCost: number;
  thomsonCost: number;
  bindingCost: number;
  packingCost: number;
  deliveryCost: number;
  outsourceCost: number;
}

export interface CalcResult {
  quantity: number;
  intermediate: CalcIntermediate;
  breakdown: CalcCostBreakdown;
  subtotal: number;
  overheadAmount: number;
  total: number;              // 100円単位切り上げ済み
  unitPrice: number;          // total / quantity
}

// ── 丁付け提案 ────────────────────────────────────────────

export interface ImpositionCandidate {
  paperId: number;
  paperName: string;
  parentSize: string;
  facesH: number;             // 横面付け数
  facesV: number;             // 縦面付け数
  totalFaces: number;         // facesH × facesV
  rotated: boolean;           // 用紙を90度回転したパターン
  actualSheets: number;
  totalSheets: number;
  paperCost: number;
  patternLabel: 'cost' | 'efficient' | 'standard';
}
