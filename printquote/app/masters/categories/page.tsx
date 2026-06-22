import { neon } from '@neondatabase/serverless';
import { CategoriesTable } from './_components/CategoriesTable';

const sql = neon(process.env.DATABASE_URL!);

export default async function CategoriesPage() {
  const rows = await sql`SELECT * FROM product_categories WHERE is_active=true ORDER BY sort_order, id`;
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">品種マスタ</h1>
        <p className="text-sm text-gray-500 mt-1">製品の種類（チラシ・名刺・封筒など）を管理します。</p>
      </div>
      <CategoriesTable initial={rows as { id: number; name: string; sort_order: number }[]} />
    </div>
  );
}
