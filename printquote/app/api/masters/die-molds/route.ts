import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getSession } from '@/lib/auth';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        dm.id,
        dm.mold_code,
        dm.mold_type,
        dm.width_mm,
        dm.height_mm,
        dm.faces,
        dm.complexity,
        dm.base_mold_cost,
        dm.customer_id,
        c.name AS customer_name,
        dm.storage_location,
        dm.manufactured_at,
        dm.note,
        dm.is_active,
        dm.created_at,
        dm.updated_at
      FROM die_molds dm
      LEFT JOIN customers c ON dm.customer_id = c.id
      ORDER BY dm.mold_code
    `;
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const b = await req.json();
    const {
      moldCode, moldType, widthMm, heightMm,
      faces, complexity, baseMoldCost,
      customerId, storageLocation, manufacturedAt, note,
    } = b;

    if (!moldCode || !moldType || !widthMm || !heightMm) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const [row] = await sql`
      INSERT INTO die_molds (
        mold_code, mold_type, width_mm, height_mm,
        faces, complexity, base_mold_cost,
        customer_id, storage_location, manufactured_at, note
      )
      VALUES (
        ${moldCode},
        ${moldType}::"MoldType",
        ${widthMm},
        ${heightMm},
        ${faces ?? 1},
        ${complexity ?? 1},
        ${baseMoldCost ?? null},
        ${customerId ?? null},
        ${storageLocation ?? null},
        ${manufacturedAt ?? null},
        ${note ?? null}
      )
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
