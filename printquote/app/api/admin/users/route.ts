import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const session = await getSession();
  if (session?.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }
  const rows = await sql`
    SELECT id, name, email, role, is_active, last_login_at, created_at
    FROM users ORDER BY created_at
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }
  const { name, email, password, role } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: '名前・メール・パスワードは必須です' }, { status: 400 });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const [row] = await sql`
      INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
      VALUES (${name}, ${email}, ${hash}, ${role ?? 'staff'}::"UserRole", true, NOW(), NOW())
      RETURNING id, name, email, role, is_active, created_at
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    const msg = String(e);
    if (msg.includes('unique')) return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
