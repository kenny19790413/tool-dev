import { neon } from '@neondatabase/serverless';
import { ProcessingsTable } from './_components/ProcessingsTable';

const sql = neon(process.env.DATABASE_URL!);

export default async function ProcessingsPage() {
  const rows = await sql`
    SELECT id, process_type, product_type, threshold,
           fixed_price, coeff_a, coeff_b, per_sheet_price, note
    FROM processing_price_masters
    ORDER BY process_type, product_type
  `;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">加工単価マスタ</h1>
        <p className="text-sm text-gray-500 mt-1">{rows.length} 件登録</p>
      </div>
      <ProcessingsTable initial={rows as Parameters<typeof ProcessingsTable>[0]['initial']} />
    </div>
  );
}
