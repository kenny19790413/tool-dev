import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getSession } from '@/lib/auth';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/estimates — 見積もり一覧
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page  = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = 20;
    const offset = (page - 1) * limit;

    const rows = await sql`
      SELECT
        e.id, e.estimate_number, e.title, e.customer_name,
        e.product_type, e.category, e.status,
        e.valid_until, e.created_at,
        u.name AS assigned_to_name,
        COUNT(ei.id)::int AS item_count
      FROM estimates e
      LEFT JOIN users u ON e.assigned_to = u.id
      LEFT JOIN estimate_items ei ON e.id = ei.estimate_id
      WHERE (${status}::text IS NULL OR e.status = ${status}::"EstimateStatus")
      GROUP BY e.id, u.name
      ORDER BY e.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ total }] = await sql`
      SELECT COUNT(*)::int AS total FROM estimates
      WHERE (${status}::text IS NULL OR status = ${status}::"EstimateStatus")
    `;

    return NextResponse.json({ data: rows, total, page, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}

// POST /api/estimates — 新規見積もり作成
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const {
      title, customerName, customerId,
      productType, category, overheadRate = 15,
      note,
    } = body;

    // 見積番号自動採番（YYYYMM-XXXX）
    const prefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const [{ seq }] = await sql`
      SELECT COALESCE(MAX(CAST(SUBSTRING(estimate_number FROM 8) AS INTEGER)), 0) + 1 AS seq
      FROM estimates
      WHERE estimate_number LIKE ${prefix + '-%'}
    `;
    const estimateNumber = `${prefix}-${String(seq).padStart(4, '0')}`;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const assignedTo = session ? Number(session.sub) : null;

    const [estimate] = await sql`
      INSERT INTO estimates
        (estimate_number, title, customer_id, customer_name,
         product_type, category, status, valid_until,
         overhead_rate, note, assigned_to, created_at, updated_at)
      VALUES (
        ${estimateNumber}, ${title},
        ${customerId ?? null}, ${customerName},
        ${productType}::"ProductType", ${category},
        'draft'::"EstimateStatus", ${validUntil.toISOString()},
        ${overheadRate}, ${note ?? null}, ${assignedTo}, NOW(), NOW()
      )
      RETURNING *
    `;

    return NextResponse.json(estimate, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}
