import { neon } from '@neondatabase/serverless';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HistoryDetail } from './_components/HistoryDetail';

const sql = neon(process.env.DATABASE_URL!);

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

interface HistoryRow {
  id: number;
  version: number;
  change_note: string | null;
  created_at: string;
  changed_by_name: string | null;
  snapshot_json: Record<string, unknown>;
}

export default async function EstimateHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const estimateId = Number(id);

  const [[estimate], histories] = await Promise.all([
    sql`
      SELECT id, estimate_number, title
      FROM estimates
      WHERE id = ${estimateId}
    `,
    sql`
      SELECT
        h.id,
        h.version,
        h.change_note,
        h.created_at,
        h.snapshot_json,
        u.name AS changed_by_name
      FROM estimate_histories h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.estimate_id = ${estimateId}
      ORDER BY h.version DESC
    `,
  ]);

  if (!estimate) notFound();

  const rows = histories as unknown as HistoryRow[];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 font-mono mb-1">
            {String(estimate.estimate_number)}
          </p>
          <h1 className="text-xl font-bold">{String(estimate.title)}</h1>
          <p className="text-sm text-gray-500 mt-0.5">変更履歴</p>
        </div>
        <Link href={`/estimates/${id}`}>
          <Button variant="outline">← 詳細に戻る</Button>
        </Link>
      </div>

      {/* 履歴カード一覧 */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm">変更履歴がまだありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((h) => {
            const snapshot = h.snapshot_json as {
              estimate?: {
                status?: string;
                title?: string;
              };
              items?: unknown[];
            };

            const snapshotStatus = snapshot?.estimate?.status ?? '—';
            const snapshotTitle = snapshot?.estimate?.title ?? '—';
            const itemsCount = Array.isArray(snapshot?.items)
              ? snapshot.items.length
              : 0;

            return (
              <Card key={h.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 text-xs font-mono">
                        v{h.version}
                      </Badge>
                      <span className="text-sm font-semibold text-gray-700">
                        {h.change_note ?? '（メモなし）'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {fmtDateTime(String(h.created_at))}
                    </span>
                  </div>
                  {h.changed_by_name && (
                    <p className="text-xs text-gray-500 mt-1">
                      変更者: {h.changed_by_name}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <HistoryDetail
                    version={h.version}
                    snapshotStatus={snapshotStatus}
                    snapshotTitle={snapshotTitle}
                    itemsCount={itemsCount}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
