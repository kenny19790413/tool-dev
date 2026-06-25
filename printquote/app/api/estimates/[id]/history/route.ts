import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/estimates/[id]/history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await sql`
      SELECT
        h.id,
        h.version,
        h.change_note,
        h.created_at,
        h.snapshot_json,
        u.name AS changed_by_name
      FROM estimate_histories h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.estimate_id = ${Number(id)}
      ORDER BY h.version DESC
    `;

    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}
