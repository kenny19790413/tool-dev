import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`SELECT * FROM product_categories WHERE is_active=true ORDER BY sort_order, id`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const [row] = await sql`
    INSERT INTO product_categories (name, sort_order)
    VALUES (${b.name}, ${b.sortOrder ?? 0}) RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}
