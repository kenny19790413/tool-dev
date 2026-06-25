'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface User {
  id: number;
  name: string;
}

interface AssigneeChangerProps {
  estimateId: number;
  currentAssigneeId: number | null;
  currentAssigneeName: string | null;
  users: User[];
  isAdmin: boolean;
}

export function AssigneeChanger({
  estimateId,
  currentAssigneeId,
  currentAssigneeName,
  users,
  isAdmin,
}: AssigneeChangerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(
    currentAssigneeId ? String(currentAssigneeId) : 'none'
  );

  const handleSave = async () => {
    setLoading(true);
    try {
      const userId = selectedId === 'none' ? null : Number(selectedId);
      const res = await fetch(`/api/estimates/${estimateId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'エラー');
      }
      toast.success('担当者を更新しました');
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '担当者の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const displayName = currentAssigneeName ?? '未割り当て';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-gray-700">{displayName}</span>
      {isAdmin && !open && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 px-2"
          onClick={() => setOpen(true)}
        >
          変更
        </Button>
      )}
      {isAdmin && open && (
        <div className="flex items-center gap-2">
          <Select
            value={selectedId}
            onValueChange={setSelectedId}
            disabled={loading}
          >
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">未割り当て</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? '保存中…' : '保存'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2"
            onClick={() => {
              setSelectedId(currentAssigneeId ? String(currentAssigneeId) : 'none');
              setOpen(false);
            }}
            disabled={loading}
          >
            キャンセル
          </Button>
        </div>
      )}
    </div>
  );
}
