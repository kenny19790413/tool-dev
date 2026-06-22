import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const b = await req.json();
    const { threshold, fixedPrice, coeffA, coeffB, perSheetPrice, note } = b;
    const [row] = await sql`
      UPDATE processing_price_masters SET
        threshold = COALESCE(${threshold ?? null}, threshold),
        fixed_price = COALESCE(${fixedPrice ?? null}, fixed_price),
        coeff_a = COALESCE(${coeffA ?? null}, coeff_a),
        coeff_b = COALESCE(${coeffB ?? null}, coeff_b),
        per_sheet_price = COALESCE(${perSheetPrice ?? null}, per_sheet_price),
        note = COALESCE(${note ?? null}, note),
        updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `;
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await sql`DELETE FROM processing_price_masters WHERE id = ${Number(id)}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
