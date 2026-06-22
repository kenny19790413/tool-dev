import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`SELECT * FROM size_masters WHERE is_active = true ORDER BY sort_order, id`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const [row] = await sql`
    INSERT INTO size_masters (name, width_mm, height_mm, note, sort_order)
    VALUES (${b.name}, ${b.widthMm}, ${b.heightMm}, ${b.note ?? null}, ${b.sortOrder ?? 0})
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}
