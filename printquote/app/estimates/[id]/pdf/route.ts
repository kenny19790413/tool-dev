import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { EstimatePdf, type EstimatePdfData } from '@/lib/pdf/EstimatePdf';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estimateId = Number(id);

    // 見積もりヘッダー取得
    const [estimate] = await sql`
      SELECT e.*, u.name AS assigned_to_name
      FROM estimates e
      LEFT JOIN users u ON e.assigned_to = u.id
      WHERE e.id = ${estimateId}
    `;
    if (!estimate) {
      return NextResponse.json({ error: '見積もりが見つかりません' }, { status: 404 });
    }

    // 明細取得（仕様情報も含む）
    const items = await sql`
      SELECT ei.id, ei.item_name, ei.sort_order,
        ei.finish_width_mm, ei.finish_height_mm,
        ei.front_colors, ei.back_colors,
        p.name AS paper_name
      FROM estimate_items ei
      LEFT JOIN papers p ON ei.paper_id = p.id
      WHERE ei.estimate_id = ${estimateId}
      ORDER BY ei.sort_order, ei.id
    `;

    // 数量結果取得
    const itemIds = items.map((i: Record<string, unknown>) => Number(i.id));
    const quantities =
      itemIds.length > 0
        ? await sql`
            SELECT estimate_item_id, quantity, unit_price, total
            FROM estimate_quantities
            WHERE estimate_item_id = ANY(${itemIds})
            ORDER BY estimate_item_id, quantity
          `
        : [];

    // PDFデータ組み立て
    const data: EstimatePdfData = {
      estimate_number: String(estimate.estimate_number),
      title: String(estimate.title),
      customer_name: String(estimate.customer_name),
      assigned_to_name: estimate.assigned_to_name
        ? String(estimate.assigned_to_name)
        : null,
      created_at: String(estimate.created_at),
      valid_until: estimate.valid_until ? String(estimate.valid_until) : null,
      note: estimate.note ? String(estimate.note) : null,
      items: items.map((item: Record<string, unknown>) => {
        const specParts: string[] = [];
        if (item.finish_width_mm && item.finish_height_mm) {
          specParts.push(`仕上 ${item.finish_width_mm}×${item.finish_height_mm}mm`);
        }
        if (item.paper_name) specParts.push(String(item.paper_name));
        if (item.front_colors != null || item.back_colors != null) {
          specParts.push(`表${item.front_colors ?? 0}色／裏${item.back_colors ?? 0}色`);
        }
        return {
          item_name: String(item.item_name),
          spec: specParts.join('　'),
          quantities: quantities
            .filter(
              (q: Record<string, unknown>) =>
                Number(q.estimate_item_id) === Number(item.id)
            )
            .map((q: Record<string, unknown>) => ({
              quantity: Number(q.quantity),
              unit_price: q.unit_price != null ? Number(q.unit_price) : null,
              total: Number(q.total),
            })),
        };
      }),
    };

    // PDF生成
    const buffer = await renderToBuffer(
      React.createElement(EstimatePdf, { data })
    );

    const filename = `見積書_${estimate.estimate_number}.pdf`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    console.error('[PDF生成エラー]', e);
    return NextResponse.json(
      { error: 'PDF生成に失敗しました', detail: String(e) },
      { status: 500 }
    );
  }
}
