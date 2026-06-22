import { neon } from '@neondatabase/serverless';
import { SpecTemplatesTable } from './_components/SpecTemplatesTable';

const sql = neon(process.env.DATABASE_URL!);

export default async function SpecTemplatesPage() {
  const [templates, categories, papers] = await Promise.all([
    sql`SELECT st.*, pc.name AS category_name, p.name AS paper_name FROM spec_templates st LEFT JOIN product_categories pc ON st.category_id=pc.id LEFT JOIN papers p ON st.paper_id=p.id WHERE st.is_active=true ORDER BY st.category_id NULLS LAST, st.name`,
    sql`SELECT id, name FROM product_categories WHERE is_active=true ORDER BY sort_order, id`,
    sql`SELECT id, name, parent_size FROM papers WHERE is_active=true ORDER BY name`,
  ]);
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold">仕様マスタ（テンプレート）</h1>
        <p className="text-sm text-gray-500 mt-1">よく使う仕様をテンプレートとして登録します。明細入力時に選択すると全項目が自動入力されます。</p>
      </div>
      <SpecTemplatesTable
        initial={templates as never}
        categories={categories as { id: number; name: string }[]}
        papers={papers as { id: number; name: string; parent_size: string }[]}
      />
    </div>
  );
}
