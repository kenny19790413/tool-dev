import { neon } from '@neondatabase/serverless';
import { DieMoldsTable } from './_components/DieMoldsTable';

const sql = neon(process.env.DATABASE_URL!);

export default async function DieMoldsPage() {
  const dieMolds = await sql`
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
      dm.is_active
    FROM die_molds dm
    LEFT JOIN customers c ON dm.customer_id = c.id
    ORDER BY dm.mold_code
  `;

  const customers = await sql`
    SELECT id, name
    FROM customers
    WHERE is_active = true
    ORDER BY name
  `;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">型台マスタ</h1>
        <p className="text-sm text-gray-500 mt-1">{dieMolds.length} 件登録</p>
      </div>
      <DieMoldsTable
        initial={dieMolds as Parameters<typeof DieMoldsTable>[0]['initial']}
        customers={customers as Parameters<typeof DieMoldsTable>[0]['customers']}
      />
    </div>
  );
}
