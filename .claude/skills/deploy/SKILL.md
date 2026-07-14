---
name: deploy
description: Deploy a project under this workspace to Vercel production, handling the Japanese-path CLI auth workaround and cloud DB persistence checks. Use when asked to deploy, redeploy, or set up production hosting for a project in this folder (e.g. printquote, meishi-order).
disable-model-invocation: true
---

`$ARGUMENTS`（プロジェクトディレクトリ名。例: `printquote`, `meishi-order`）を本番デプロイする。

## このワークスペース特有の制約

- パスに日本語（`ツール開発`）が含まれるため、Vercel CLIの対話ログイン（`vercel login`）は `ByteString` エラーで必ず失敗する。**Personal Access Token方式のみ使う。**
- npmキャッシュが壊れて `npx` 経由のパッケージ取得が `ENOENT` で失敗することがある。発生したら `npm cache verify` を先に実行してから再試行する。

## 手順

1. **既存設定の確認**: プロジェクト直下に `TEST_ENV.md` や `SESSION_*.md` がないか探す。あれば過去のVercelプロジェクト名・scope・環境変数一覧・DB構成を再利用する。なければ今回新規に記録する前提で進める。
2. **トークン取得**: ユーザーに https://vercel.com/account/tokens で新規トークンを発行してもらい、共有してもらう。トークンは `.env` やコミット対象ファイルに保存せず、コマンド実行時だけ使う。
3. **リンク・デプロイ**:
   ```
   npx vercel link --token "$VERCEL_TOKEN" --yes
   npx vercel --prod --token "$VERCEL_TOKEN" --scope <team-slug> --yes
   ```
4. **環境変数の設定・変更**:
   ```
   npx vercel env add <NAME> production --token "$VERCEL_TOKEN" --scope <team-slug>
   npx vercel env rm <NAME> production --token "$VERCEL_TOKEN" --scope <team-slug> --yes
   ```
5. **クラウドDBを新規に使う場合の永続化チェック（重要・省略しない）**:
   - 「ダッシュボードに表示されている」「接続に成功した」だけでは、無料/トライアル枠のDBが正式にclaim（永続化）されたと判断しない。
   - 提供元の公式な「claim完了」「課金開始」を示す明示的なステータス表示で確認する。確認できない場合はその旨をユーザーに伝える。
   - 確認できるまで、または無料プランに自動バックアップがない場合は、デプロイ前に自前バックアップ手段（全テーブルのJSONエクスポート等、`npm run db:backup`のような形）を用意することを提案する。
   - 参考事例: meishi-orderでPrisma Postgresの「claim済み」誤判定によりデータ消失事故が発生し、Neonへ移行＋自前バックアップ導入で対応した。同じ判断ミスを繰り返さないこと。
6. **デプロイ後の動作確認**: 発行されたURLで主要フロー（ログイン→主要機能→管理画面など）を実際に操作して確認する。
   - **注意（Playwright等でE2E自動操作する場合）**: 検証環境のDBに実データ（他社・他ユーザーの本番相当データ）が既に入っている場合、`.first()`のような曖昧な要素セレクタは**意図せず実データの行を操作してしまう危険がある**。特に「削除」「画像削除」など元に戻せない操作を伴う検証では、テスト用に作成したデータの名称・IDなど一意な値を含むセレクタを使い、実行前に対象レコードのIDをログ出力するなどして誤操作にすぐ気づけるようにする。可能なら検証専用のテストデータをフィルタで絞り込んでから操作する。
   - 参考事例: meishi-orderでPlaywright検証中に`.first()`相当の曖昧な選択により実データ（CardFormat）の画像を誤って完全削除してしまう事故が発生した（詳細は`SESSION_20260714.md`）。
7. **記録**: プロジェクト直下の `TEST_ENV.md` に本番URL・テストアカウント・インフラ構成・再デプロイ手順・バックアップ手順をまとめる（既存があれば更新、なければ新規作成）。

## 完了報告

作業完了後、ユーザーに以下を報告する:
- 本番URL
- 使用したVercelプロジェクト名・scope
- 環境変数の設定状況
- クラウドDBの永続化確認結果（確認できた／できていない）
- バックアップ手段の有無
