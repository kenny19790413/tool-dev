import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`SELECT * FROM production_day_masters ORDER BY process_type, quantity_min`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const [row] = await sql`
    INSERT INTO production_day_masters (process_type, quantity_min, quantity_max, days, note)
    VALUES (${b.processType}, ${b.quantityMin ?? 0}, ${b.quantityMax ?? null}, ${b.days}, ${b.note ?? null})
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}
