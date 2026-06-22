import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { signToken, cookieOptions, EXPIRES_SEC, type JwtPayload } from '@/lib/auth';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 });
    }

    const [user] = await sql`
      SELECT id, name, email, password_hash, role, is_active
      FROM users WHERE email = ${email} LIMIT 1
    `;

    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, String(user.password_hash));
    if (!ok) {
      return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });
    }

    const payload: JwtPayload = {
      sub: String(user.id),
      name: String(user.name),
      email: String(user.email),
      role: user.role as 'admin' | 'staff',
    };
    const token = await signToken(payload);

    // last_login_at 更新
    await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`;

    const res = NextResponse.json({ ok: true, user: { name: user.name, role: user.role } });
    res.cookies.set({ ...cookieOptions(EXPIRES_SEC), value: token });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
