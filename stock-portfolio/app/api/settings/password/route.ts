import { NextRequest, NextResponse } from 'next/server';
import { changePassword } from '@/lib/credential';

export async function PATCH(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '現在のパスワードと新しいパスワードを入力してください' }, { status: 400 });
    }

    const result = await changePassword(currentPassword, newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
