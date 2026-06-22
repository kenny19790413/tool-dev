import { neon } from '@neondatabase/serverless';
import { SizesTable } from './_components/SizesTable';

const sql = neon(process.env.DATABASE_URL!);

export default async function SizesPage() {
  const rows = await sql`SELECT * FROM size_masters WHERE is_active=true ORDER BY sort_order, id`;
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">サイズマスタ</h1>
        <p className="text-sm text-gray-500 mt-1">定型仕上がりサイズを登録します。明細入力時に選択→自動入力されます。</p>
      </div>
      <SizesTable initial={rows as { id: number; name: string; width_mm: number; height_mm: number; note: string | null; sort_order: number }[]} />
    </div>
  );
}
