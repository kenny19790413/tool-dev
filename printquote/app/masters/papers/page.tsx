import { neon } from '@neondatabase/serverless';
import { PapersTable } from './_components/PapersTable';

const sql = neon(process.env.DATABASE_URL!);

export default async function PapersPage() {
  const papers = await sql`
    SELECT id, number, name, parent_size, width_mm, height_mm,
           ream_weight, unit_price, low_vol_price, rate, supplier, note, is_active
    FROM papers
    ORDER BY number
  `;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">用紙マスタ</h1>
        <p className="text-sm text-gray-500 mt-1">{papers.length} 件登録</p>
      </div>
      <PapersTable initial={papers as Parameters<typeof PapersTable>[0]['initial']} />
    </div>
  );
}
