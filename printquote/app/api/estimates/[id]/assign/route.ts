import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getSession } from '@/lib/auth';
import { saveHistory } from '@/lib/history';

const sql = neon(process.env.DATABASE_URL!);

// PATCH /api/estimates/[id]/assign
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const { id } = await params;
    const estimateId = Number(id);
    const body = await req.json();
    const userId: number | null = body.userId ?? null;

    // 担当者を更新
    await sql`
      UPDATE estimates
      SET assigned_to = ${userId}, updated_at = NOW()
      WHERE id = ${estimateId}
    `;

    // 担当者名を取得
    let assignedToName: string | null = null;
    if (userId !== null) {
      const [user] = await sql`SELECT name FROM users WHERE id = ${userId}`;
      assignedToName = user ? String(user.name) : null;
    }

    // 変更履歴を保存
    const newName = assignedToName ?? '未割り当て';
    await saveHistory(
      estimateId,
      Number(session.sub),
      `担当者を「${newName}」に変更`
    );

    return NextResponse.json({
      assigned_to: userId,
      assigned_to_name: assignedToName,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}
