import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, name_kana, contact_name, email, phone, address, note, is_active
      FROM customers
      ORDER BY name
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
    const { name, nameKana, contactName, email, phone, address, note } = b;
    if (!name) return NextResponse.json({ error: '顧客名は必須です' }, { status: 400 });
    const [row] = await sql`
      INSERT INTO customers (name, name_kana, contact_name, email, phone, address, note)
      VALUES (${name}, ${nameKana ?? null}, ${contactName ?? null}, ${email ?? null}, ${phone ?? null}, ${address ?? null}, ${note ?? null})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
