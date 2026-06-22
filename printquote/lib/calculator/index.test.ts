// ============================================================
// PrintQuote 計算エンジン — 境界値テスト
// テストランナー: Vitest / Jest どちらでも動作
// ============================================================

import { describe, it, expect } from 'vitest';
import { calculate, calculateVariants } from './index';
import { calcIntermediate } from './base';
import { calcPaperCost } from './paper';
import { calcPlateCost } from './plate';
import {
  calcCuttingCost,
  calcPressCost,
  calcPpCost,
  calcEmbossCost,
  calcLaminationCost,
} from './processing';
import { calcThomsonCost } from './thomson';
import type { CalcInput, PaperMaster, ProcessingPriceMaster, PrintPriceMaster } from './types';

// ── テスト用マスタデータ ────────────────────────────────────

const samplePaper: PaperMaster = {
  id: 1,
  number: 10,
  name: 'コートL 90kg A全',
  parentSize: 'A全',
  widthMm: 625,
  heightMm: 880,
  reamWeight: 17.0,  // 連量(kg)
  unitPrice: 8.5,    // ㎏単価（円/kg）
  lowVolPrice: 10.0,
  rate: 100,
};

const samplePrintMasters: PrintPriceMaster[] = [
  { colorType: 'process', minSheets: 0,    maxSheets: 1000,  unitPrice: 1.2 },
  { colorType: 'process', minSheets: 1000, maxSheets: 5000,  unitPrice: 0.9 },
  { colorType: 'process', minSheets: 5000, maxSheets: null,  unitPrice: 0.7 },
];

const sampleProcessingMasters: ProcessingPriceMaster[] = [
  // 断裁 4段階
  { processType: 'cutting', productType: null, threshold: 3000,  fixedPrice: 1500,  coeffA: null, coeffB: null, perSheetPrice: null },
  { processType: 'cutting', productType: null, threshold: 10000, fixedPrice: 2000,  coeffA: null, coeffB: null, perSheetPrice: null },
  { processType: 'cutting', productType: null, threshold: 20000, fixedPrice: 3000,  coeffA: null, coeffB: null, perSheetPrice: null },
  { processType: 'cutting', productType: null, threshold: 99999999, fixedPrice: 0,  coeffA: null, coeffB: null, perSheetPrice: 0.25 },
  // プレス
  { processType: 'press', productType: null, threshold: 640,  fixedPrice: 8000,  coeffA: 14, coeffB: 4,  perSheetPrice: null },
  // PP
  { processType: 'pp',    productType: null, threshold: 500,  fixedPrice: 10000, coeffA: 27, coeffB: 11, perSheetPrice: null },
  // エンボス
  { processType: 'emboss', productType: null, threshold: 1500, fixedPrice: 6000,  coeffA: null, coeffB: null, perSheetPrice: 4 },
  // 合紙（厚物）
  { processType: 'lamination', productType: 'thick', threshold: 500, fixedPrice: 8000, coeffA: 40, coeffB: 0,  perSheetPrice: null },
  // 合紙（薄物）
  { processType: 'lamination', productType: 'thin',  threshold: 500, fixedPrice: 8000, coeffA: 20, coeffB: 10, perSheetPrice: null },
];

const defaultMoldTable = { 1: 3000, 2: 5000, 3: 8000, 4: 12000, 5: 20000 };

// ── 基本値計算テスト ────────────────────────────────────────

describe('calcIntermediate', () => {
  it('実枚数・全紙数を正しく計算する', () => {
    const r = calcIntermediate({
      quantity: 3000, faces: 8, cuts: 1,
      wasteRate: 15, hasThomson: false,
    } as CalcInput);
    // 実枚数 = ceil(3000/8) = 375
    expect(r.actualSheets).toBe(375);
    // ヤレ枚数 = ceil(375 × 15%) = 57
    expect(r.wasteSheets).toBe(57);
    // 全紙数 = ceil((375+57)/50)*50 = ceil(432/50)*50 = 9×50 = 450
    expect(r.totalSheets).toBe(450);
    // 通し数 = 3000/8/1 = 375
    expect(r.passes).toBe(375);
  });

  it('トムソンあり: ヤレ枚数に+100', () => {
    const r = calcIntermediate({
      quantity: 3000, faces: 8, cuts: 1,
      wasteRate: 15, hasThomson: true,
    } as CalcInput);
    expect(r.wasteSheets).toBe(57 + 100); // 157
  });

  it('全紙数は50枚単位切り上げ', () => {
    // actualSheets=1000, waste=150 → 合計1150 → 切り上げ 1150（ちょうど50の倍数）
    const r = calcIntermediate({
      quantity: 8000, faces: 8, cuts: 1,
      wasteRate: 15, hasThomson: false,
    } as CalcInput);
    expect(r.totalSheets % 50).toBe(0);
  });
});

// ── 用紙費テスト ────────────────────────────────────────────

describe('calcPaperCost', () => {
  // reamWeight=17, unitPrice=8.5
  it('薄物: 連量 × ㎏単価 × 枚数 ÷ 1000', () => {
    const cost = calcPaperCost(samplePaper, 1000, 'thin');
    // 17 × 8.5 × 1000 / 1000 = 144.5 → roundUp100 = 200
    expect(cost).toBe(Math.ceil(17 * 8.5 * 1000 / 1000 / 100) * 100);
  });

  it('厚物: 連量 × ㎏単価 × 枚数 ÷ 100', () => {
    const cost = calcPaperCost(samplePaper, 1000, 'thick');
    // 17 × 8.5 × 1000 / 100 = 1445 → roundUp100 = 1500
    expect(cost).toBe(Math.ceil(17 * 8.5 * 1000 / 100 / 100) * 100);
  });

  it('枚数が増えると比例して増加する', () => {
    const c1 = calcPaperCost(samplePaper, 2000, 'thin');
    const c2 = calcPaperCost(samplePaper, 4000, 'thin');
    expect(c2).toBeGreaterThan(c1);
  });
});

// ── 刷版費テスト ────────────────────────────────────────────

describe('calcPlateCost', () => {
  it('4色(表4裏0, コーターなし): 版数=4, 版単価=1800+200×faces', () => {
    const cost = calcPlateCost(4, 0, 'none', 8);
    // 版数=4, 単価=1800+200×8=3400, 費=4×3400=13600
    expect(cost).toBe(4 * (1800 + 200 * 8));
  });

  it('3色以下: 版単価=2300+200×faces', () => {
    const cost = calcPlateCost(2, 0, 'none', 4);
    // 版数=2, 単価=2300+200×4=3100, 費=2×3100=6200
    expect(cost).toBe(2 * (2300 + 200 * 4));
  });

  it('片面コーター: 版数を-1する', () => {
    const cost = calcPlateCost(4, 0, 'single', 8);
    // 版数=4-1=3, 単価=1800+1600=3400, 費=3×3400=10200
    expect(cost).toBe(3 * (1800 + 200 * 8));
  });

  it('両面コーター: 版数を-2する', () => {
    const cost = calcPlateCost(4, 4, 'double', 4);
    // 版数=8-2=6, 単価(8色>=4)=1800+200×4=2600, 費=6×2600=15600
    expect(cost).toBe(6 * (1800 + 200 * 4));
  });
});

// ── 断裁費テスト（4段階境界値） ────────────────────────────

describe('calcCuttingCost', () => {
  const m = sampleProcessingMasters;
  it('2,999枚 → 1,500円', () =>
    expect(calcCuttingCost(m, 2999, 'thick')).toBe(1500));
  it('3,000枚 → 2,000円（境界）', () =>
    expect(calcCuttingCost(m, 3000, 'thick')).toBe(2000));
  it('9,999枚 → 2,000円', () =>
    expect(calcCuttingCost(m, 9999, 'thick')).toBe(2000));
  it('10,000枚 → 3,000円（境界）', () =>
    expect(calcCuttingCost(m, 10000, 'thick')).toBe(3000));
  it('19,999枚 → 3,000円', () =>
    expect(calcCuttingCost(m, 19999, 'thick')).toBe(3000));
  it('20,000枚 → 従量(0.25×枚数)', () =>
    expect(calcCuttingCost(m, 20000, 'thick')).toBe(Math.round(20000 * 0.25)));
  it('30,000枚 → 7,500円', () =>
    expect(calcCuttingCost(m, 30000, 'thick')).toBe(Math.round(30000 * 0.25)));
});

// ── プレス費テスト（閾値640） ──────────────────────────────

describe('calcPressCost', () => {
  // 625×880mm、面積=0.55m²
  it('640通し以下 → 8,000円固定', () => {
    // actualSheets=540 → passes=540+100=640
    const cost = calcPressCost(sampleProcessingMasters, 540, 625, 880, 'thick');
    expect(cost).toBe(8000);
  });

  it('641通し超 → 従量', () => {
    // actualSheets=541 → passes=641
    const cost = calcPressCost(sampleProcessingMasters, 541, 625, 880, 'thick');
    // unitPrice = roundUp1(0.55×14+4) = roundUp1(11.7) = 11.7
    const area = (625 * 880) / 1_000_000;
    const unitPrice = Math.ceil((area * 14 + 4) * 10) / 10;
    const expected = Math.ceil(641 * unitPrice / 100) * 100;
    expect(cost).toBe(expected);
  });
});

// ── PP費テスト（閾値500） ──────────────────────────────────

describe('calcPpCost', () => {
  it('500通し以下 → 10,000円固定', () => {
    const cost = calcPpCost(sampleProcessingMasters, 400, 625, 880, 'thick');
    expect(cost).toBe(10000);
  });

  it('501通し以上 → 従量', () => {
    const cost = calcPpCost(sampleProcessingMasters, 401, 625, 880, 'thick');
    const area = (625 * 880) / 1_000_000;
    const unitPrice = Math.ceil((area * 27 + 11) * 10) / 10;
    const expected = Math.ceil(501 * unitPrice / 100) * 100;
    expect(cost).toBe(expected);
  });
});

// ── エンボス費テスト（閾値1500） ──────────────────────────

describe('calcEmbossCost', () => {
  it('1,500通し以下 → 6,000円固定', () => {
    expect(calcEmbossCost(sampleProcessingMasters, 1400, 'thick')).toBe(6000);
  });
  it('1,501通し以上 → 4円/通し', () => {
    const cost = calcEmbossCost(sampleProcessingMasters, 1401, 'thick');
    expect(cost).toBe(Math.ceil(1501 * 4 / 100) * 100);
  });
});

// ── トムソン費テスト ────────────────────────────────────────

describe('calcThomsonCost', () => {
  it('型なし: 木型代 + 組付け + 抜き', () => {
    // faces=4, plateCount=4, complexity=2, quantity=1000
    const cost = calcThomsonCost({
      hasMold: false, moldData: null, moldComplexity: 2,
      moldUnitPriceTable: defaultMoldTable,
      plateCount: 4, faces: 4, quantity: 1000,
    });
    const moldCost = 4 * 5000 * 4;           // 80,000
    const assemblyCost = 4 * (2500 + 4*500); // 4 × 4500 = 18,000
    const punchCost = Math.ceil((6000 + 1000/4 * 2.5) / 100) * 100; // ROUNDUP(6625, -2) = 6700
    expect(cost).toBe(moldCost + assemblyCost + punchCost);
  });

  it('型あり(保管): 木型代=0', () => {
    const moldData = { id: 1, moldCode: 'M001', faces: 4, complexity: 2, baseMoldCost: 0 };
    const cost = calcThomsonCost({
      hasMold: true, moldData, moldComplexity: 2,
      moldUnitPriceTable: defaultMoldTable,
      plateCount: 4, faces: 4, quantity: 1000,
    });
    const assemblyCost = 4 * (2500 + 4*500);
    const punchCost = Math.ceil((6000 + 250 * 2.5) / 100) * 100;
    expect(cost).toBe(0 + assemblyCost + punchCost);
  });
});

// ── 統合テスト（calculate） ─────────────────────────────────

describe('calculate (統合)', () => {
  const baseInput: CalcInput = {
    productType: 'thick',
    finishWidthMm: 210,
    finishHeightMm: 297,
    faces: 8,
    cuts: 1,
    frontColors: 4,
    backColors: 0,
    coater: 'none',
    colorType: 'process',
    wasteRate: 15,
    hasThomson: false,
    hasMold: false,
    moldData: null,
    moldComplexity: 1,
    moldUnitPriceTable: defaultMoldTable,
    processTypes: ['cutting'],
    quantity: 3000,
    paper: samplePaper,
    printPriceMasters: samplePrintMasters,
    processingPriceMasters: sampleProcessingMasters,
    overheadRate: 15,
  };

  it('合計は100円単位になる', () => {
    const r = calculate(baseInput);
    expect(r.total % 100).toBe(0);
  });

  it('単価 = 合計 / 数量', () => {
    const r = calculate(baseInput);
    expect(r.unitPrice).toBeCloseTo(r.total / r.quantity, 5);
  });

  it('営業経費 = 小計 × overheadRate%', () => {
    const r = calculate(baseInput);
    expect(r.overheadAmount).toBe(Math.round(r.subtotal * 0.15));
  });
});

// ── 数量バリエーションテスト ────────────────────────────────

describe('calculateVariants', () => {
  it('3数量を一括計算できる', () => {
    const base: CalcInput = {
      productType: 'thick',
      finishWidthMm: 210, finishHeightMm: 297,
      faces: 4, cuts: 1,
      frontColors: 4, backColors: 0,
      coater: 'none', colorType: 'process',
      wasteRate: 15, hasThomson: false,
      hasMold: false, moldData: null, moldComplexity: 1,
      moldUnitPriceTable: defaultMoldTable,
      processTypes: [],
      quantity: 0, // バリアントで上書きされる
      paper: samplePaper,
      printPriceMasters: samplePrintMasters,
      processingPriceMasters: sampleProcessingMasters,
      overheadRate: 15,
    };

    const results = calculateVariants(base, [1000, 3000, 5000]);
    expect(results).toHaveLength(3);
    expect(results[0].quantity).toBe(1000);
    expect(results[1].quantity).toBe(3000);
    expect(results[2].quantity).toBe(5000);
    // 数量が多いほど単価が下がる（規模の経済）
    expect(results[0].unitPrice).toBeGreaterThan(results[1].unitPrice);
    expect(results[1].unitPrice).toBeGreaterThan(results[2].unitPrice);
  });
});
