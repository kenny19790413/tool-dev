import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`
    SELECT st.*, pc.name AS category_name, p.name AS paper_name
    FROM spec_templates st
    LEFT JOIN product_categories pc ON st.category_id = pc.id
    LEFT JOIN papers p ON st.paper_id = p.id
    WHERE st.is_active = true
    ORDER BY st.category_id NULLS LAST, st.name
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const [row] = await sql`
    INSERT INTO spec_templates (
      name, category_id, finish_width_mm, finish_height_mm,
      paper_id, faces, cuts, front_colors, back_colors,
      coater, color_type, waste_rate, process_types, default_quantities, note
    ) VALUES (
      ${b.name}, ${b.categoryId ?? null}, ${b.finishWidthMm ?? null}, ${b.finishHeightMm ?? null},
      ${b.paperId ?? null}, ${b.faces ?? 1}, ${b.cuts ?? 1},
      ${b.frontColors ?? 4}, ${b.backColors ?? 0},
      ${b.coater ?? 'none'}, ${b.colorType ?? 'process'},
      ${b.wasteRate ?? 15}, ${b.processTypes ?? []}, ${b.defaultQuantities ?? '1000,3000,5000'},
      ${b.note ?? null}
    ) RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}
