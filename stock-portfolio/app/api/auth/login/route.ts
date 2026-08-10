import { NextRequest, NextResponse } from 'next/server';
import { signToken, cookieOptions, EXPIRES_SEC } from '@/lib/auth';
import { verifyPassword } from '@/lib/credential';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password || !(await verifyPassword(password))) {
      return NextResponse.json({ error: 'パスワードが違います' }, { status: 401 });
    }

    const token = await signToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ ...cookieOptions(EXPIRES_SEC), value: token });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
