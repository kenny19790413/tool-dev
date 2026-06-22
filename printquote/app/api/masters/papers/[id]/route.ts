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
    const { number, name, parentSize, widthMm, heightMm, reamWeight, unitPrice, sheetPrice, lowVolPrice, rate, supplier, note, isActive } = b;
    const [row] = await sql`
      UPDATE papers SET
        number = COALESCE(${number ?? null}, number),
        name = COALESCE(${name ?? null}, name),
        parent_size = COALESCE(${parentSize ?? null}, parent_size),
        width_mm = COALESCE(${widthMm ?? null}, width_mm),
        height_mm = COALESCE(${heightMm ?? null}, height_mm),
        ream_weight = COALESCE(${reamWeight ?? null}, ream_weight),
        unit_price = ${unitPrice ?? null},
        sheet_price = ${sheetPrice ?? null},
        low_vol_price = COALESCE(${lowVolPrice ?? null}, low_vol_price),
        rate = COALESCE(${rate ?? null}, rate),
        supplier = COALESCE(${supplier ?? null}, supplier),
        note = COALESCE(${note ?? null}, note),
        is_active = COALESCE(${isActive ?? null}, is_active),
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
    await sql`UPDATE papers SET is_active = false, updated_at = NOW() WHERE id = ${Number(id)}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
