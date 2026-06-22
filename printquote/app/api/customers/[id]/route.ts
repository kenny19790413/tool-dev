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
    const { name, nameKana, contactName, email, phone, address, note, isActive } = b;
    const [row] = await sql`
      UPDATE customers SET
        name = COALESCE(${name ?? null}, name),
        name_kana = COALESCE(${nameKana ?? null}, name_kana),
        contact_name = COALESCE(${contactName ?? null}, contact_name),
        email = COALESCE(${email ?? null}, email),
        phone = COALESCE(${phone ?? null}, phone),
        address = COALESCE(${address ?? null}, address),
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
    await sql`UPDATE customers SET is_active = false, updated_at = NOW() WHERE id = ${Number(id)}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
