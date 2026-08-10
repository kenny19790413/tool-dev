# StockPortfolio

単株（日本株・米国株）・債券・ファンド・プライベート資産を一元管理する個人用資産管理サイト。

- 単株: 銘柄検索→登録すると、現在値・年間配当をYahoo Finance非公式APIから自動取得。ダッシュボードの「株価を更新」で再取得可能。
- 債券・ファンド・プライベート資産: 時価が自動取得できないため、詳細ページから評価額を手動更新（履歴として記録）。
- ダッシュボードで総資産（円換算）・資産クラス別内訳・年間配当見込みを表示。
- 非公開システム（単一パスワードでログイン、Cookie+JWTで保護）。モバイル対応。

## 開発

```bash
npm install
npx prisma migrate dev   # 初回のみ（DATABASE_URLが必要）
npm run dev
```

`.env` に以下を設定:

```
DATABASE_URL=postgresql://...
JWT_SECRET=任意のランダム文字列
APP_PASSWORD=ログインパスワード
```

## デプロイ

[DEPLOY.md](./DEPLOY.md) 参照。
