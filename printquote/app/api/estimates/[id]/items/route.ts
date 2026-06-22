import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/estimates/[id]/items
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'DB エラー' }, { status: 500 });
  }
}

// POST /api/estimates/[id]/items
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estimateId = Number(id);
    const body = await req.json();

    const {
      itemName, finishWidthMm, finishHeightMm,
      paperId, faces, cuts, frontColors, backColors,
      coater, colorType, wasteRate,
      hasMold, moldComplexity, processTypes, note,
    } = body;

    if (!itemName || !finishWidthMm || !finishHeightMm) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    // 用紙情報を取得
    let paperRow: Record<string, unknown> | null = null;
    if (paperId) {
      const rows = await sql`SELECT * FROM papers WHERE id = ${Number(paperId)} LIMIT 1`;
      paperRow = rows[0] ?? null;
    }

    // ソート順
    const [{ max_sort }] = await sql`
      SELECT COALESCE(MAX(sort_order), 0) AS max_sort
      FROM estimate_items WHERE estimate_id = ${estimateId}
    `;
    const sortOrder = Number(max_sort) + 1;

    // estimate_items に INSERT
    const [item] = await sql`
      INSERT INTO estimate_items (
        estimate_id, sort_order, item_name,
        finish_width_mm, finish_height_mm,
        paper_id, paper_name, paper_width_mm, paper_height_mm, paper_unit_price,
        faces, cuts, front_colors, back_colors, coater, color_type, waste_rate,
        has_mold, mold_complexity, note
      ) VALUES (
        ${estimateId}, ${sortOrder}, ${itemName},
        ${finishWidthMm}, ${finishHeightMm},
        ${paperId ?? null},
        ${paperRow?.name ?? null},
        ${paperRow?.width_mm ?? null},
        ${paperRow?.height_mm ?? null},
        ${paperRow?.unit_price ?? null},
        ${faces ?? 1}, ${cuts ?? 1},
        ${frontColors ?? 4}, ${backColors ?? 0},
        ${coater ?? 'none'}::"CoaterType",
        ${colorType ?? 'process'}::"ColorType",
        ${wasteRate ?? 15},
        ${hasMold ?? false},
        ${moldComplexity ?? 1},
        ${note ?? null}
      )
      RETURNING *
    `;

    // estimate_processings に INSERT
    if (Array.isArray(processTypes) && processTypes.length > 0) {
      for (let i = 0; i < processTypes.length; i++) {
        await sql`
          INSERT INTO estimate_processings (estimate_item_id, process_type, sort_order)
          VALUES (${item.id}, ${processTypes[i]}::"ProcessType", ${i + 1})
        `;
      }
    }

    return NextResponse.json(
      { ...item, processTypes: processTypes ?? [] },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
