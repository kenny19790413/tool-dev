# PrintQuote — Vercelデプロイ手順

## 初回デプロイ（Vercel CLIを使う方法）

### ステップ1: Vercel CLIインストール
```bash
npm install -g vercel
```

### ステップ2: Vercelにログイン
```bash
vercel login
```
→ ブラウザが開くのでメールアドレスでサインイン

### ステップ3: printquoteディレクトリでデプロイ
```bash
cd "C:\Users\kenny\OneDrive\Desktop\ツール開発\printquote"
vercel --prod
```

初回は以下の質問に答える:
- Set up and deploy? → **Y**
- Which scope? → 自分のアカウント
- Link to existing project? → **N**（新規）
- Project name? → **printquote** (任意)
- In which directory is your code? → **./**
- Override settings? → **N**

### ステップ4: 環境変数を設定

Vercelダッシュボード (https://vercel.com) → プロジェクト選択 → Settings → Environment Variables

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_easAk5C6LGHl@ep-withered-wind-aoo6o0di.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | `printquote-jwt-secret-okabunkan-2026` |

Environment: **Production** + **Preview** の両方にチェック

### ステップ5: 再デプロイ（環境変数を反映）
```bash
vercel --prod
```

---

## 2回目以降のデプロイ

コードを変更したら:
```bash
cd "C:\Users\kenny\OneDrive\Desktop\ツール開発\printquote"
vercel --prod
```

または GitHub push で自動デプロイ（後述）

---

## GitHub連携で自動デプロイ（推奨）

1. Vercelダッシュボード → プロジェクト → Settings → Git
2. 「Connect Git Repository」→ GitHubを選択
3. リポジトリ: `kenny19790413/tool-dev`
4. **Root Directory**: `printquote` に設定（重要！）
5. Save

以降は `git push` するたびに自動でVercelにデプロイされる。

---

## 本番URL

デプロイ後は `https://printquote-xxxxx.vercel.app` 形式のURLが発行される。
カスタムドメインを設定することも可能。

---

## 管理者アカウント

- Email: `admin@okabunkan.co.jp`
- Password: `admin1234`

複数人でアクセス可能。スタッフアカウントは `/admin/users` から追加。
