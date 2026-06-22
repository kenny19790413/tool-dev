import { neon } from '@neondatabase/serverless';
import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { getSession } from '@/lib/auth';
import { EstimateSearchBar } from './_components/EstimateSearchBar';

const sql = neon(process.env.DATABASE_URL!);

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  draft:    { label: '下書き',   variant: 'secondary' },
  issued:   { label: '発行済み', variant: 'default' },
  approved: { label: '承認済み', variant: 'default' },
  rejected: { label: '却下',     variant: 'destructive' },
  expired:  { label: '期限切れ', variant: 'secondary' },
};
const PRODUCT_LABEL: Record<string, string> = { thick: '厚物', thin: '薄物' };

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getSession();
  const isAdmin = session?.role === 'admin';
  const userId = session ? Number(session.sub) : null;
  const { q, status } = await searchParams;

  const keyword = q ? `%${q}%` : null;
  const statusFilter = status || null;

  // 検索条件込みでクエリ
  const estimates = isAdmin
    ? keyword && statusFilter
      ? await sql`
          SELECT e.id, e.estimate_number, e.title, e.customer_name,
            e.product_type, e.category, e.status, e.valid_until, e.created_at,
            u.name AS assigned_to_name,
            (SELECT COUNT(*) FROM estimate_items ei WHERE ei.estimate_id = e.id) AS item_count
          FROM estimates e LEFT JOIN users u ON e.assigned_to = u.id
          WHERE (e.title ILIKE ${keyword} OR e.customer_name ILIKE ${keyword})
            AND e.status = ${statusFilter}
          ORDER BY e.created_at DESC LIMIT 100`
      : keyword
      ? await sql`
          SELECT e.id, e.estimate_number, e.title, e.customer_name,
            e.product_type, e.category, e.status, e.valid_until, e.created_at,
            u.name AS assigned_to_name,
            (SELECT COUNT(*) FROM estimate_items ei WHERE ei.estimate_id = e.id) AS item_count
          FROM estimates e LEFT JOIN users u ON e.assigned_to = u.id
          WHERE e.title ILIKE ${keyword} OR e.customer_name ILIKE ${keyword}
          ORDER BY e.created_at DESC LIMIT 100`
      : statusFilter
      ? await sql`
          SELECT e.id, e.estimate_number, e.title, e.customer_name,
            e.product_type, e.category, e.status, e.valid_until, e.created_at,
            u.name AS assigned_to_name,
            (SELECT COUNT(*) FROM estimate_items ei WHERE ei.estimate_id = e.id) AS item_count
          FROM estimates e LEFT JOIN users u ON e.assigned_to = u.id
          WHERE e.status = ${statusFilter}
          ORDER BY e.created_at DESC LIMIT 100`
      : await sql`
          SELECT e.id, e.estimate_number, e.title, e.customer_name,
            e.product_type, e.category, e.status, e.valid_until, e.created_at,
            u.name AS assigned_to_name,
            (SELECT COUNT(*) FROM estimate_items ei WHERE ei.estimate_id = e.id) AS item_count
          FROM estimates e LEFT JOIN users u ON e.assigned_to = u.id
          ORDER BY e.created_at DESC LIMIT 100`
    // staffは自分の見積のみ
    : keyword && statusFilter
    ? await sql`
        SELECT e.id, e.estimate_number, e.title, e.customer_name,
          e.product_type, e.category, e.status, e.valid_until, e.created_at,
          u.name AS assigned_to_name,
          (SELECT COUNT(*) FROM estimate_items ei WHERE ei.estimate_id = e.id) AS item_count
        FROM estimates e LEFT JOIN users u ON e.assigned_to = u.id
        WHERE e.assigned_to = ${userId}
          AND (e.title ILIKE ${keyword} OR e.customer_name ILIKE ${keyword})
          AND e.status = ${statusFilter}
        ORDER BY e.created_at DESC LIMIT 100`
    : keyword
    ? await sql`
        SELECT e.id, e.estimate_number, e.title, e.customer_name,
          e.product_type, e.category, e.status, e.valid_until, e.created_at,
          u.name AS assigned_to_name,
          (SELECT COUNT(*) FROM estimate_items ei WHERE ei.estimate_id = e.id) AS item_count
        FROM estimates e LEFT JOIN users u ON e.assigned_to = u.id
        WHERE e.assigned_to = ${userId}
          AND (e.title ILIKE ${keyword} OR e.customer_name ILIKE ${keyword})
        ORDER BY e.created_at DESC LIMIT 100`
    : statusFilter
    ? await sql`
        SELECT e.id, e.estimate_number, e.title, e.customer_name,
          e.product_type, e.category, e.status, e.valid_until, e.created_at,
          u.name AS assigned_to_name,
          (SELECT COUNT(*) FROM estimate_items ei WHERE ei.estimate_id = e.id) AS item_count
        FROM estimates e LEFT JOIN users u ON e.assigned_to = u.id
        WHERE e.assigned_to = ${userId} AND e.status = ${statusFilter}
        ORDER BY e.created_at DESC LIMIT 100`
    : await sql`
        SELECT e.id, e.estimate_number, e.title, e.customer_name,
          e.product_type, e.category, e.status, e.valid_until, e.created_at,
          u.name AS assigned_to_name,
          (SELECT COUNT(*) FROM estimate_items ei WHERE ei.estimate_id = e.id) AS item_count
        FROM estimates e LEFT JOIN users u ON e.assigned_to = u.id
        WHERE e.assigned_to = ${userId}
        ORDER BY e.created_at DESC LIMIT 100`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">見積もり一覧</h1>
          <p className="text-sm text-gray-500">{estimates.length} 件</p>
        </div>
        <Link href="/estimates/new">
          <Button>＋ 新規見積もり</Button>
        </Link>
      </div>

      {/* 検索バー */}
      <Suspense>
        <EstimateSearchBar />
      </Suspense>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>見積番号</TableHead>
              <TableHead>件名</TableHead>
              <TableHead>顧客名</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>作成日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  {(q || status) ? '検索条件に一致する見積もりがありません。' : '見積もりがありません。「新規見積もり」から作成してください。'}
                </TableCell>
              </TableRow>
            ) : (
              estimates.map((e) => {
                const s = STATUS_LABEL[String(e.status)] ?? { label: String(e.status), variant: 'secondary' as const };
                return (
                  <TableRow key={String(e.id)} className="hover:bg-gray-50">
                    <TableCell>
                      <Link
                        href={`/estimates/${e.id}`}
                        className="font-mono text-blue-600 hover:underline"
                      >
                        {String(e.estimate_number)}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{String(e.title)}</TableCell>
                    <TableCell>{String(e.customer_name)}</TableCell>
                    <TableCell>{PRODUCT_LABEL[String(e.product_type)] ?? String(e.product_type)}</TableCell>
                    <TableCell>{String(e.category)}</TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell>{e.assigned_to_name ? String(e.assigned_to_name) : '—'}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(String(e.created_at)).toLocaleDateString('ja-JP')}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
