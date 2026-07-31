---
name: run-manga
description: Run, screenshot, and visually verify manga.html (漫画発売リスト). Use when asked to run, start, screenshot, or verify the manga list app.
---

# run-manga

漫画発売リスト (`manga.html`) をローカルサーバーで起動し、Playwright Chromium でドライブするスキル。  
ドライバー: `.claude/skills/run-manga/driver.mjs`

## 前提条件

```bash
# プロジェクトルートで一度だけ実行（playwright はすでにインストール済み）
cd "C:\Users\kenny\OneDrive\Desktop\ツール開発"
npx playwright install chromium
```

## Run（エージェント用）

```bash
cd "C:\Users\kenny\OneDrive\Desktop\ツール開発"
node .claude/skills/run-manga/driver.mjs ss
```

スクリーンショットは `.claude/skills/run-manga/screenshots/` に保存される。

### コマンド一覧

| コマンド | 内容 |
|---------|------|
| `node driver.mjs ss` | ログイン画面のスクリーンショット撮影 |
| `node driver.mjs login-screen` | 同上（明示的） |
| `node driver.mjs open <url>` | 任意 URL を開いてスクリーンショット |

ドライバーはサーバーが未起動なら自動で `npx serve -p 8765` を起動する。

## Run（人間用）

```bash
cd "C:\Users\kenny\OneDrive\Desktop\ツール開発"
npx serve -p 8765
# ブラウザで http://localhost:8765/manga.html を開く
# Googleでサインイン → Firebase Realtime Database に接続
```

## 確認済みの動作

- ログイン画面（Googleサインイン）: 表示OK（スクリーンショット済み）
- ログイン後の画面: Firebase Auth が必要なため自動テスト不可

## Gotchas

- **Firebase Auth の壁**: Googleログインはヘッドレスブラウザで自動化できない。ログイン後の UI 変更検証は手動ログインが必要。
- **serve の 301 リダイレクト**: `manga.html` へのアクセスは一度リダイレクトされるが、ドライバーは `follow` で処理済み。
- **auth-loading overlay**: Firebase の初期化中はローディング画面が出る。ドライバーは最大 5 秒待ってから撮影する。
- **ポート競合**: 8765 を他のプロセスが使っていると起動失敗。`netstat -ano | findstr 8765` で確認。

## Troubleshooting

| 症状 | 対処 |
|------|------|
| `サーバーの起動がタイムアウト` | ポート 8765 が使用中。他のプロセスを終了するか PORT を変更 |
| `Cannot find package 'playwright'` | `npm install playwright` を実行 |
| スクリーンショットが真っ黒 | `waitUntil: 'networkidle'` のタイムアウトを延ばす |
