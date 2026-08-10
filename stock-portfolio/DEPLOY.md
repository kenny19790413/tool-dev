# StockPortfolio — Vercelデプロイ手順

printquoteと同じ構成（Next.js + Prisma + Neon + Vercel）です。
このPCはコンピューター名が日本語のためVercel CLIがエラーになることがあるので、
**GitHub連携での自動デプロイ**を推奨します（Vercel CLIは使わない）。

## 前提

- GitHubリポジトリ（printquote等と同じ `kenny19790413/tool-dev` を利用可）
- Neonプロジェクト（作成済み、DATABASE_URLはローカルの`.env`に設定済み）

## 手順

### 1. GitHubにpush

このディレクトリ（stock-portfolio）を含むリポジトリにコミット・pushする。

### 2. Vercelでプロジェクト作成

1. https://vercel.com のダッシュボード → 「Add New...」→「Project」
2. GitHubリポジトリ（`tool-dev`）をImport
3. **Root Directory**: `stock-portfolio` に設定（重要）
4. Framework Preset: Next.js（自動検出される）
5. 「Deploy」をクリック（この時点では環境変数未設定なのでビルド後の初回アクセスはエラーになる）

### 3. 環境変数を設定

Vercelダッシュボード → プロジェクト → Settings → Environment Variables

| Name | Value |
|------|-------|
| `DATABASE_URL` | Neonの接続文字列（ローカル`.env`と同じもの） |
| `JWT_SECRET` | ランダムな文字列（ローカル`.env`と同じでも新規発行でも可） |
| `APP_PASSWORD` | 初回アクセス時のみ使うログインパスワード（以降は`/settings`画面からアプリ内で変更可能） |

Environment: **Production** + **Preview** の両方にチェック

### 4. 再デプロイ

Settings → Deployments → 最新デプロイの「...」→「Redeploy」
（または `git push` で新しいコミットを作ると自動デプロイされる）

### 5. 以降のデプロイ

コードを変更したら `git push` するだけで自動デプロイされる（GitHub連携済みのため）。

---

## 本番URL

デプロイ後は `https://stock-portfolio-xxxxx.vercel.app` 形式のURLが発行される。
非公開システムのため、このURLは他人に共有しないこと（ログインパスワードで保護されているが、URL自体も推測されにくいものにしたい場合はVercelのカスタムドメイン設定も可能）。

## ログイン

- 初回パスワード: `APP_PASSWORD`で設定した値。ログイン後、右上ナビの「設定」からいつでもパスワードを変更できる。

## 運用メモ

- 単株（日本株・米国株）は「株価を更新」ボタンでYahoo Finance非公式APIから現在値・配当を取得する。銘柄検索は英数字のみ対応（日本語検索不可、銘柄コードかローマ字/英語社名で検索）。
- 債券・ファンド・プライベート資産は時価が自動取得できないため、詳細ページから定期的に評価額を手動更新する運用とする。
- Yahoo Finance側の仕様変更で株価取得が失敗するようになった場合でも、資産の登録・閲覧・手動評価額更新は引き続き可能。
