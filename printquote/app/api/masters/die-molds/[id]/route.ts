import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getSession } from '@/lib/auth';

const sql = neon(process.env.DATABASE_URL!);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const { id } = await params;
    const b = await req.json();
    const {
      moldCode, moldType, widthMm, heightMm,
      faces, complexity, baseMoldCost,
      customerId, storageLocation, manufacturedAt, note, isActive,
    } = b;

    const [row] = await sql`
      UPDATE die_molds SET
        mold_code        = COALESCE(${moldCode ?? null}, mold_code),
        mold_type        = COALESCE(${moldType ?? null}::"MoldType", mold_type),
        width_mm         = COALESCE(${widthMm ?? null}, width_mm),
        height_mm        = COALESCE(${heightMm ?? null}, height_mm),
        faces            = COALESCE(${faces ?? null}, faces),
        complexity       = COALESCE(${complexity ?? null}, complexity),
        base_mold_cost   = ${baseMoldCost ?? null},
        customer_id      = ${customerId ?? null},
        storage_location = COALESCE(${storageLocation ?? null}, storage_location),
        manufactured_at  = COALESCE(${manufacturedAt ?? null}, manufactured_at),
        note             = COALESCE(${note ?? null}, note),
        is_active        = COALESCE(${isActive ?? null}, is_active),
        updated_at       = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `;
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const { id } = await params;
    await sql`
      UPDATE die_molds SET is_active = false, updated_at = NOW()
      WHERE id = ${Number(id)}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
