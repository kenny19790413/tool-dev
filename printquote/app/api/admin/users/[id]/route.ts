import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

const sql = neon(process.env.DATABASE_URL!);

async function requireAdmin() {
  const session = await getSession();
  if (session?.role !== 'admin') return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }
  const { id } = await params;
  const { name, email, role, isActive, password } = await req.json();

  // パスワード変更がある場合はハッシュ化
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${Number(id)}`;
  }

  const [row] = await sql`
    UPDATE users SET
      name      = COALESCE(${name ?? null}, name),
      email     = COALESCE(${email ?? null}, email),
      role      = COALESCE(${role ? `${role}` : null}::"UserRole", role),
      is_active = COALESCE(${isActive ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${Number(id)}
    RETURNING id, name, email, role, is_active
  `;
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  const { id } = await params;
  if (String(id) === session.sub) {
    return NextResponse.json({ error: '自分自身は無効化できません' }, { status: 400 });
  }
  await sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${Number(id)}`;
  return NextResponse.json({ ok: true });
}
