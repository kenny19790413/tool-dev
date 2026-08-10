'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DeleteAssetButton({ assetId }: { assetId: number }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleClick() {
    if (!confirm('この資産を削除しますか？履歴も含めて削除され、元に戻せません。')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '削除に失敗しました');
      toast.success('削除しました');
      router.push('/assets');
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
      setDeleting(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={deleting} variant="destructive" size="sm">
      <Trash2 />
      {deleting ? '削除中…' : '削除'}
    </Button>
  );
}
