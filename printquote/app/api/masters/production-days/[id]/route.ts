import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const [row] = await sql`
    UPDATE production_day_masters SET
      process_type = COALESCE(${b.processType ?? null}, process_type),
      quantity_min = COALESCE(${b.quantityMin ?? null}, quantity_min),
      quantity_max = ${b.quantityMax ?? null},
      days = COALESCE(${b.days ?? null}, days),
      note = ${b.note ?? null},
      updated_at = NOW()
    WHERE id = ${Number(id)} RETURNING *
  `;
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM production_day_masters WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
