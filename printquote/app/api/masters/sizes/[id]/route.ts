import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const [row] = await sql`
    UPDATE size_masters SET name=${b.name}, width_mm=${b.widthMm}, height_mm=${b.heightMm},
      note=${b.note ?? null}, sort_order=${b.sortOrder ?? 0}
    WHERE id=${Number(id)} RETURNING *
  `;
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`UPDATE size_masters SET is_active=false WHERE id=${Number(id)}`;
  return NextResponse.json({ ok: true });
}
