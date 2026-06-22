import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`SELECT * FROM holidays ORDER BY date`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  try {
    const [row] = await sql`
      INSERT INTO holidays (date, name, type)
      VALUES (${b.date}, ${b.name}, ${b.type ?? 'public'})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: '同じ日付が既に登録されています' }, { status: 400 });
  }
}
