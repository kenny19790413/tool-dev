'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Customer {
  id: number;
  name: string;
  name_kana: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  is_active: boolean;
}

interface CustomerDialogProps {
  customer?: Customer;
  trigger: React.ReactNode;
  onDone: () => void;
}

function CustomerDialog({ customer, trigger, onDone }: CustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEdit = !!customer;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name'),
      nameKana: fd.get('nameKana') || null,
      contactName: fd.get('contactName') || null,
      email: fd.get('email') || null,
      phone: fd.get('phone') || null,
      address: fd.get('address') || null,
      note: fd.get('note') || null,
    };
    setSaving(true);
    try {
      const url = isEdit ? `/api/customers/${customer.id}` : '/api/customers';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(isEdit ? '更新しました' : '顧客を追加しました');
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '顧客を編集' : '顧客を追加'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div>
            <Label>会社名 *</Label>
            <Input name="name" defaultValue={customer?.name} required />
          </div>
          <div>
            <Label>フリガナ</Label>
            <Input name="nameKana" defaultValue={customer?.name_kana ?? ''} />
          </div>
          <div>
            <Label>担当者名</Label>
            <Input name="contactName" defaultValue={customer?.contact_name ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>電話番号</Label>
              <Input name="phone" defaultValue={customer?.phone ?? ''} />
            </div>
            <div>
              <Label>メールアドレス</Label>
              <Input name="email" type="email" defaultValue={customer?.email ?? ''} />
            </div>
          </div>
          <div>
            <Label>住所</Label>
            <Input name="address" defaultValue={customer?.address ?? ''} />
          </div>
          <div>
            <Label>備考</Label>
            <Input name="note" defaultValue={customer?.note ?? ''} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button type="submit" disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomersTable({ initial }: { initial: Customer[] }) {
  const [customers, setCustomers] = useState<Customer[]>(initial);

  const reload = useCallback(async () => {
    const res = await fetch('/api/customers');
    if (res.ok) setCustomers(await res.json());
  }, []);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`「${name}」を無効化しますか？`)) return;
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('無効化しました');
      reload();
    } else {
      toast.error('失敗しました');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CustomerDialog
          trigger={<Button>＋ 顧客を追加</Button>}
          onDone={reload}
        />
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-xs">
              <TableHead>会社名</TableHead>
              <TableHead>フリガナ</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>電話</TableHead>
              <TableHead>メール</TableHead>
              <TableHead className="w-16 text-center">状態</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id} className={!c.is_active ? 'opacity-40' : ''}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-gray-500">{c.name_kana ?? '—'}</TableCell>
                <TableCell className="text-sm">{c.contact_name ?? '—'}</TableCell>
                <TableCell className="text-sm">{c.phone ?? '—'}</TableCell>
                <TableCell className="text-sm text-blue-600">{c.email ?? '—'}</TableCell>
                <TableCell className="text-center">
                  {c.is_active
                    ? <Badge variant="outline" className="text-xs text-green-700 border-green-300">有効</Badge>
                    : <Badge variant="outline" className="text-xs text-gray-400">無効</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <CustomerDialog
                      customer={c}
                      trigger={<Button size="sm" variant="ghost" className="text-xs h-7 px-2">編集</Button>}
                      onDone={reload}
                    />
                    {c.is_active && (
                      <Button
                        size="sm" variant="ghost"
                        className="text-xs h-7 px-2 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        無効化
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-gray-400">
                  顧客が登録されていません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
