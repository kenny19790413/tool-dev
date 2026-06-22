import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const [row] = await sql`
    UPDATE spec_templates SET
      name=${b.name}, category_id=${b.categoryId ?? null},
      finish_width_mm=${b.finishWidthMm ?? null}, finish_height_mm=${b.finishHeightMm ?? null},
      paper_id=${b.paperId ?? null}, faces=${b.faces ?? 1}, cuts=${b.cuts ?? 1},
      front_colors=${b.frontColors ?? 4}, back_colors=${b.backColors ?? 0},
      coater=${b.coater ?? 'none'}, color_type=${b.colorType ?? 'process'},
      waste_rate=${b.wasteRate ?? 15}, process_types=${b.processTypes ?? []},
      default_quantities=${b.defaultQuantities ?? '1000,3000,5000'}, note=${b.note ?? null}
    WHERE id=${Number(id)} RETURNING *
  `;
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`UPDATE spec_templates SET is_active=false WHERE id=${Number(id)}`;
  return NextResponse.json({ ok: true });
}
