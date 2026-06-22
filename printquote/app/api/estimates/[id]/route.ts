import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/estimates/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [estimate] = await sql`
      SELECT e.*, u.name AS assigned_to_name
      FROM estimates e
      LEFT JOIN users u ON e.assigned_to = u.id
      WHERE e.id = ${Number(id)}
    `;
    if (!estimate) {
      return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    // 明細 + 加工リスト
    const items = await sql`
      SELECT ei.*,
        COALESCE(
          array_agg(ep.process_type::text ORDER BY ep.sort_order)
          FILTER (WHERE ep.process_type IS NOT NULL),
          ARRAY[]::text[]
        ) AS process_types
      FROM estimate_items ei
      LEFT JOIN estimate_processings ep ON ep.estimate_item_id = ei.id
      WHERE ei.estimate_id = ${Number(id)}
      GROUP BY ei.id
      ORDER BY ei.sort_order, ei.id
    `;

    // 数量計算結果
    const itemIds = items.map((i: Record<string, unknown>) => i.id);
    const quantities =
      itemIds.length > 0
        ? await sql`
            SELECT * FROM estimate_quantities
            WHERE estimate_item_id = ANY(${itemIds})
            ORDER BY estimate_item_id, quantity
          `
        : [];

    const itemsWithData = items.map((item: Record<string, unknown>) => ({
      ...item,
      quantities: quantities.filter(
        (q: Record<string, unknown>) => q.estimate_item_id === item.id
      ),
    }));

    return NextResponse.json({ ...estimate, items: itemsWithData });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}

// PATCH /api/estimates/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, customerName, status, note, validUntil } = body;

    const [updated] = await sql`
      UPDATE estimates SET
        title         = COALESCE(${title ?? null}, title),
        customer_name = COALESCE(${customerName ?? null}, customer_name),
        status        = COALESCE(${status ?? null}::"EstimateStatus", status),
        note          = COALESCE(${note ?? null}, note),
        valid_until   = COALESCE(${validUntil ?? null}, valid_until),
        updated_at    = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `;
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}
