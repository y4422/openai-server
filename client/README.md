# OpenAI API クライアント (Vercel AI SDK)

このプロジェクトは、OpenAI APIを使用したチャットアプリケーションのクライアント側の実装です。
サーバー側のプロキシを通じてAPIと通信し、Vercel AI SDKの`@ai-sdk/react`パッケージの`useChat`フックを利用してリアルタイムなストリーミングチャットを実現します。

## セットアップ

1. 依存関係をインストールします：
   ```bash
   npm install
   ```
   (`@ai-sdk/react`, `ai` などが含まれます)

2. `.env.local`ファイルを作成し、必要な環境変数を設定します：
   ```
   NEXT_PUBLIC_OPENAI_PROXY_URL=http://localhost:3000/api/proxy
   NEXT_PUBLIC_INTERNAL_TOKEN=your-internal-token
   ```

## 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3001` を開いてアプリケーションを確認できます。
サーバー側のプロキシ（デフォルトでは`http://localhost:3000/api/proxy`）が実行されていることを確認してください。

## 機能

- Vercel AI SDK (`useChat`フック) を使用したチャットインターフェース
- サーバー側のプロキシを通じた安全なAPI通信 (ストリーミング対応)
- リアルタイムなメッセージ応答表示
- ローディング状態、エラー状態のハンドリング

## 設定

### 環境変数

- `NEXT_PUBLIC_OPENAI_PROXY_URL`: サーバー側のOpenAI APIプロキシエンドポイント (例: `http://localhost:3000/api/proxy`)
- `NEXT_PUBLIC_INTERNAL_TOKEN`: サーバー側APIへのリクエストを認証するためのトークン

## 動作の仕組み

- `src/components/ChatClient.tsx`内の`useChat`フックが、指定された`api`エンドポイント（プロキシURL）にリクエストを送信します。
- リクエストヘッダーには`INTERNAL_TOKEN`が含まれ、サーバー側で認証されます。
- サーバー側のプロキシはOpenAI APIからのストリーミングレスポンスを中継し、クライアントはこれをリアルタイムで処理・表示します。
- APIキーはサーバー側にのみ存在し、クライアント側には露出しません。 