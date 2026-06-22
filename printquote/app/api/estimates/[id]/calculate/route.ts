import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { calculateVariants } from '@/lib/calculator';
import type {
  PaperMaster,
  PrintPriceMaster,
  ProcessingPriceMaster,
  ProcessType,
} from '@/lib/calculator/types';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estimateId = Number(id);

    const body = await req.json();
    const { itemId, quantities } = body as { itemId: number; quantities: number[] };

    if (!itemId || !Array.isArray(quantities) || quantities.length === 0) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    // 見積もり取得
    const [estimate] = await sql`
      SELECT overhead_rate, product_type FROM estimates WHERE id = ${estimateId} LIMIT 1
    `;
    if (!estimate) {
      return NextResponse.json({ error: '見積もりが見つかりません' }, { status: 404 });
    }

    const overheadRate = Number(estimate.overhead_rate);
    const productType = estimate.product_type as 'thick' | 'thin';

    // 明細取得
    const [item] = await sql`
      SELECT * FROM estimate_items WHERE id = ${itemId} AND estimate_id = ${estimateId} LIMIT 1
    `;
    if (!item) {
      return NextResponse.json({ error: '明細が見つかりません' }, { status: 404 });
    }

    // 加工リスト取得
    const processings = await sql`
      SELECT process_type FROM estimate_processings
      WHERE estimate_item_id = ${itemId} ORDER BY sort_order
    `;
    const processTypes = processings.map(
      (p: Record<string, unknown>) => p.process_type as ProcessType
    );

    // 用紙マスタ取得
    if (!item.paper_id) {
      return NextResponse.json({ error: '用紙が設定されていません' }, { status: 400 });
    }
    const [paperRow] = await sql`SELECT * FROM papers WHERE id = ${item.paper_id} LIMIT 1`;
    if (!paperRow) {
      return NextResponse.json({ error: '用紙マスタが見つかりません' }, { status: 404 });
    }

    // 印刷単価マスタ取得
    const printPriceRows = await sql`
      SELECT color_type, min_sheets, max_sheets, unit_price
      FROM print_price_masters ORDER BY color_type, min_sheets
    `;

    // 加工単価マスタ取得
    const processingPriceRows = await sql`
      SELECT process_type, product_type, threshold, fixed_price, coeff_a, coeff_b, per_sheet_price
      FROM processing_price_masters ORDER BY process_type
    `;

    // 木型単価テーブル（複雑度1〜5）
    const moldUnitPriceTable = { 1: 30000, 2: 50000, 3: 80000, 4: 120000, 5: 200000 };

    const paper: PaperMaster = {
      id: Number(paperRow.id),
      number: Number(paperRow.number),
      name: String(paperRow.name),
      parentSize: String(paperRow.parent_size),
      widthMm: Number(paperRow.width_mm),
      heightMm: Number(paperRow.height_mm),
      reamWeight: paperRow.ream_weight != null ? Number(paperRow.ream_weight) : 0,
      unitPrice: paperRow.unit_price != null ? Number(paperRow.unit_price) : null,
      sheetPrice: paperRow.sheet_price != null ? Number(paperRow.sheet_price) : null,
      lowVolPrice: paperRow.low_vol_price != null ? Number(paperRow.low_vol_price) : null,
      rate: Number(paperRow.rate),
    };

    const printPriceMasters: PrintPriceMaster[] = printPriceRows.map(
      (r: Record<string, unknown>) => ({
        colorType: r.color_type as 'process' | 'special',
        minSheets: Number(r.min_sheets),
        maxSheets: r.max_sheets != null ? Number(r.max_sheets) : null,
        unitPrice: Number(r.unit_price),
      })
    );

    const processingPriceMasters: ProcessingPriceMaster[] = processingPriceRows.map(
      (r: Record<string, unknown>) => ({
        processType: r.process_type as ProcessType,
        productType: (r.product_type as 'thick' | 'thin') ?? null,
        threshold: Number(r.threshold),
        fixedPrice: Number(r.fixed_price),
        coeffA: r.coeff_a != null ? Number(r.coeff_a) : null,
        coeffB: r.coeff_b != null ? Number(r.coeff_b) : null,
        perSheetPrice: r.per_sheet_price != null ? Number(r.per_sheet_price) : null,
      })
    );

    const baseInput = {
      productType,
      finishWidthMm: Number(item.finish_width_mm),
      finishHeightMm: Number(item.finish_height_mm),
      faces: Number(item.faces),
      cuts: Number(item.cuts),
      frontColors: Number(item.front_colors),
      backColors: Number(item.back_colors),
      coater: item.coater as 'none' | 'single' | 'double',
      colorType: item.color_type as 'process' | 'special',
      wasteRate: Number(item.waste_rate),
      hasThomson: processTypes.includes('thomson' as ProcessType),
      hasMold: Boolean(item.has_mold),
      moldData: null,
      moldComplexity: Number(item.mold_complexity ?? 1),
      moldUnitPriceTable,
      processTypes,
      paper,
      printPriceMasters,
      processingPriceMasters,
      overheadRate,
    };

    // 計算実行（複数数量バリエーション）
    const results = calculateVariants(baseInput, quantities);

    // estimate_quantitiesに保存（削除→挿入）
    for (const r of results) {
      const b = r.breakdown;
      const inter = r.intermediate;

      await sql`
        DELETE FROM estimate_quantities
        WHERE estimate_item_id = ${itemId} AND quantity = ${r.quantity}
      `;

      await sql`
        INSERT INTO estimate_quantities (
          estimate_item_id, quantity,
          actual_sheets, waste_sheets, total_sheets, passes,
          paper_cost, plate_cost, print_cost, ink_cost,
          cutting_cost, press_cost, pp_cost, emboss_cost, foil_cost,
          lamination_cost, corrugated_cost, thomson_cost, binding_cost,
          packing_cost, delivery_cost, outsource_cost,
          subtotal, overhead_amount, total, unit_price, calculated_at
        ) VALUES (
          ${itemId}, ${r.quantity},
          ${inter.actualSheets}, ${inter.wasteSheets}, ${inter.totalSheets}, ${inter.passes},
          ${b.paperCost}, ${b.plateCost}, ${b.printCost}, ${b.inkCost},
          ${b.cuttingCost}, ${b.pressCost}, ${b.ppCost}, ${b.embossCost}, ${b.foilCost},
          ${b.laminationCost}, ${b.corrugatedCost}, ${b.thomsonCost}, ${b.bindingCost},
          ${b.packingCost}, ${b.deliveryCost}, ${b.outsourceCost},
          ${r.subtotal}, ${r.overheadAmount}, ${r.total}, ${r.unitPrice}, NOW()
        )
      `;
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
