'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  issued: '発行済み',
  approved: '承認済み',
  rejected: '却下',
  expired: '期限切れ',
};

const STATUS_COLOR: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-800',
  issued:   'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired:  'bg-orange-100 text-orange-800',
};

interface HistoryDetailProps {
  version: number;
  snapshotStatus: string;
  snapshotTitle: string;
  itemsCount: number;
}

export function HistoryDetail({
  version,
  snapshotStatus,
  snapshotTitle,
  itemsCount,
}: HistoryDetailProps) {
  const [expanded, setExpanded] = useState(false);

  const statusLabel = STATUS_LABEL[snapshotStatus] ?? snapshotStatus;
  const statusColor = STATUS_COLOR[snapshotStatus] ?? 'bg-gray-100 text-gray-800';

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => setExpanded((p) => !p)}
      >
        {expanded ? '▲ 閉じる' : `▼ v${version} の内容を見る`}
      </Button>

      {expanded && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border rounded-lg p-4 bg-gray-50">
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">件名</dt>
            <dd className="font-medium">{snapshotTitle}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">ステータス</dt>
            <dd>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">明細数</dt>
            <dd className="font-medium">{itemsCount} 件</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
