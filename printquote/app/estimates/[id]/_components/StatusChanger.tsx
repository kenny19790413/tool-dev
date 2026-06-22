'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type EstimateStatus = 'draft' | 'issued' | 'approved' | 'rejected' | 'expired';

const STATUS_LABEL: Record<EstimateStatus, string> = {
  draft: '下書き', issued: '発行済み', approved: '承認済み',
  rejected: '却下', expired: '期限切れ',
};

export function StatusChanger({
  estimateId,
  currentStatus,
}: {
  estimateId: number;
  currentStatus: EstimateStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleChange = async (newStatus: EstimateStatus) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`ステータスを「${STATUS_LABEL[newStatus]}」に変更しました`);
      router.refresh();
    } catch {
      toast.error('ステータスの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 pt-4 border-t flex items-center gap-3">
      <span className="text-sm text-gray-500">ステータス変更：</span>
      <Select
        value={currentStatus}
        onValueChange={(v) => handleChange(v as EstimateStatus)}
        disabled={loading}
      >
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="draft">下書き</SelectItem>
          <SelectItem value="issued">発行済み</SelectItem>
          <SelectItem value="approved">承認済み</SelectItem>
          <SelectItem value="rejected">却下</SelectItem>
          <SelectItem value="expired">期限切れ</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
