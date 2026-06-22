import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, number, name, parent_size, width_mm, height_mm,
             ream_weight, unit_price, sheet_price, low_vol_price, rate, supplier, note, is_active
      FROM papers
      ORDER BY number
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
    const { number, name, parentSize, widthMm, heightMm, reamWeight, unitPrice, sheetPrice, lowVolPrice, rate, supplier, note } = b;
    if (!number || !name || !widthMm || !heightMm) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }
    const [row] = await sql`
      INSERT INTO papers (number, name, parent_size, width_mm, height_mm, ream_weight, unit_price, sheet_price, low_vol_price, rate, supplier, note)
      VALUES (${number}, ${name}, ${parentSize ?? 'A全'}, ${widthMm}, ${heightMm},
              ${reamWeight ?? null}, ${unitPrice ?? null}, ${sheetPrice ?? null}, ${lowVolPrice ?? null}, ${rate ?? 100}, ${supplier ?? null}, ${note ?? null})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
