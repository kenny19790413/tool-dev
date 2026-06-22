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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

// ── ユーザー追加・編集ダイアログ ─────────────────────────────────

interface UserDialogProps {
  user?: User;
  trigger: React.ReactNode;
  onDone: () => void;
}

function UserDialog({ user, trigger, onDone }: UserDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string>(user?.role ?? 'staff');
  const isEdit = !!user;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get('password') ?? '');
    if (!isEdit && password.length < 6) {
      toast.error('パスワードは6文字以上で入力してください');
      return;
    }
    const body: Record<string, unknown> = {
      name: fd.get('name'),
      email: fd.get('email'),
      role,
    };
    if (password) body.password = password;

    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/users/${user.id}` : '/api/admin/users';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(isEdit ? '更新しました' : 'ユーザーを追加しました');
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'ユーザーを編集' : 'ユーザーを追加'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div>
            <Label>氏名 *</Label>
            <Input name="name" defaultValue={user?.name} required className="mt-1" />
          </div>
          <div>
            <Label>メールアドレス *</Label>
            <Input name="email" type="email" defaultValue={user?.email} required className="mt-1" />
          </div>
          <div>
            <Label>権限</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">担当者</SelectItem>
                <SelectItem value="admin">管理者</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isEdit ? 'パスワード（変更する場合のみ）' : 'パスワード *'}</Label>
            <Input
              name="password"
              type="password"
              placeholder={isEdit ? '変更しない場合は空欄' : '6文字以上'}
              required={!isEdit}
              className="mt-1"
            />
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

// ── テーブル本体 ─────────────────────────────────────────────────

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('ja-JP') : '—';

export function UsersTable({ initial, currentUserId }: { initial: User[]; currentUserId: string }) {
  const [users, setUsers] = useState<User[]>(initial);

  const reload = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers(await res.json());
  }, []);

  async function handleToggle(u: User) {
    if (String(u.id) === currentUserId) {
      toast.error('自分自身は変更できません');
      return;
    }
    const action = u.is_active ? '無効化' : '有効化';
    if (!confirm(`「${u.name}」を${action}しますか？`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.is_active }),
    });
    if (res.ok) {
      toast.success(`${action}しました`);
      reload();
    } else {
      toast.error('失敗しました');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <UserDialog
          trigger={<Button>＋ ユーザーを追加</Button>}
          onDone={reload}
        />
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-xs">
              <TableHead>氏名</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead className="w-24 text-center">権限</TableHead>
              <TableHead className="w-20 text-center">状態</TableHead>
              <TableHead className="w-28">最終ログイン</TableHead>
              <TableHead className="w-28">作成日</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className={!u.is_active ? 'opacity-40' : ''}>
                <TableCell className="font-medium">
                  {u.name}
                  {String(u.id) === currentUserId && (
                    <span className="ml-2 text-xs text-blue-500">（自分）</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-600">{u.email}</TableCell>
                <TableCell className="text-center">
                  {u.role === 'admin'
                    ? <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">管理者</Badge>
                    : <Badge variant="outline" className="text-xs">担当者</Badge>}
                </TableCell>
                <TableCell className="text-center">
                  {u.is_active
                    ? <Badge variant="outline" className="text-xs text-green-700 border-green-300">有効</Badge>
                    : <Badge variant="outline" className="text-xs text-gray-400">無効</Badge>}
                </TableCell>
                <TableCell className="text-sm text-gray-500">{fmtDate(u.last_login_at)}</TableCell>
                <TableCell className="text-sm text-gray-500">{fmtDate(u.created_at)}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <UserDialog
                      user={u}
                      trigger={<Button size="sm" variant="ghost" className="text-xs h-7 px-2">編集</Button>}
                      onDone={reload}
                    />
                    {String(u.id) !== currentUserId && (
                      <Button
                        size="sm" variant="ghost"
                        className={`text-xs h-7 px-2 ${u.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                        onClick={() => handleToggle(u)}
                      >
                        {u.is_active ? '無効化' : '有効化'}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
