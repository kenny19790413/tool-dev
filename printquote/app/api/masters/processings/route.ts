import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, process_type, product_type, threshold,
             fixed_price, coeff_a, coeff_b, per_sheet_price, note
      FROM processing_price_masters
      ORDER BY process_type, product_type
    `;
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const { processType, productType, threshold, fixedPrice, coeffA, coeffB, perSheetPrice, note } = b;
    if (!processType || threshold == null || fixedPrice == null) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }
    const [row] = await sql`
      INSERT INTO processing_price_masters
        (process_type, product_type, threshold, fixed_price, coeff_a, coeff_b, per_sheet_price, note)
      VALUES (
        ${processType}::"ProcessType",
        ${productType ?? null}::"ProductType",
        ${threshold}, ${fixedPrice},
        ${coeffA ?? null}, ${coeffB ?? null}, ${perSheetPrice ?? null}, ${note ?? null}
      )
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
