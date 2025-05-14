# OpenAI プロキシサーバー (Vercel AI SDK対応)

クライアント側でVercel AI SDK (`@ai-sdk/react`) を使用し、サーバー側のNext.js APIルートプロキシを通じてOpenAI APIのストリーミングレスポンスを利用するサンプルです。

## プロジェクト構成

- **サーバー側（ルートディレクトリ）**: OpenAI APIへのプロキシ。Vercel AI SDK (`ai`, `@ai-sdk/openai`) を使用してストリーミング応答を処理し、Edge Runtimeで動作します。
- **クライアント側（`client/`ディレクトリ）**: プロキシを通じてOpenAI APIと通信するNext.jsアプリケーション。Vercel AI SDKの`useChat`フックを使用します。

## Gitサブモジュールの設定

クライアント側のアプリケーションを別のリポジトリとして管理し、サブモジュールとして追加する場合は以下の手順に従ってください：

1. クライアント側のリポジトリを作成します（例：GitHub上で新しいリポジトリを作成）

2. クライアントディレクトリを初期化して新しいリポジトリにプッシュします：

```bash
cd client
git init
git add .
git commit -m "初期コミット"
git branch -M main
git remote add origin git@github.com:yourusername/openai-client.git
git push -u origin main
```

3. クライアントディレクトリを削除し、サブモジュールとして追加します：

```bash
cd ..
rm -rf client
git submodule add git@github.com:yourusername/openai-client.git client
git commit -m "クライアントをサブモジュールとして追加"
```

4. リポジトリをクローンする際には、サブモジュールも含めて取得します：

```bash
git clone --recurse-submodules git@github.com:yourusername/openai-server.git
```

または、既にクローンしたリポジトリにサブモジュールを取得する場合：

```bash
git submodule init
git submodule update
```

## セットアップ

### サーバー側のセットアップ (ルートディレクトリ)

1. 依存関係をインストールします:
   ```bash
   npm install
   ```
   (`ai`, `@ai-sdk/openai`, `openai`などが含まれます)

2. `.env.local`ファイルを作成し、環境変数を設定します:
   ```
   OPENAI_API_KEY=sk-your-openai-api-key
   INTERNAL_TOKEN=your-internal-token 
   ```

### クライアント側のセットアップ (`client/`ディレクトリ)

1. クライアントディレクトリに移動します:
   ```bash
   cd client
   ```
2. 依存関係をインストールします:
   ```bash
   npm install
   ```
   (`@ai-sdk/react`, `ai`などが含まれます)

3. `.env.local`ファイルを作成し、環境変数を設定します:
   ```
   NEXT_PUBLIC_OPENAI_PROXY_URL=http://localhost:3000/api/proxy
   NEXT_PUBLIC_INTERNAL_TOKEN=your-internal-token
   ```

## 開発サーバーの起動

### サーバー側 (ルートディレクトリ)

```bash
npm run dev
```
サーバーは `http://localhost:3000` で実行されます。

### クライアント側 (`client/`ディレクトリ)

別のターミナルでクライアントディレクトリに移動し、以下のコマンドを実行します:

```bash
cd client
npm run dev
```
クライアントは `http://localhost:3001` で実行されます。

## 仕組み

### 1. プロキシAPIルート (サーバー側: `src/app/api/proxy/route.ts`)

- Edge Runtimeで動作します。
- Vercel AI SDK (`@ai-sdk/openai`のプロバイダと`ai`の`streamText`) を使用して、OpenAI APIからのレスポンスをストリーミング形式に変換します。
- `result.toDataStreamResponse()` を使用して、ストリームをクライアントに返します。
- クライアントからのリクエストに対し、`INTERNAL_TOKEN`による認証を行います。
- CORSヘッダーを適切に設定するため、`middleware.ts`も使用しています。

### 2. チャットクライアント (クライアント側: `client/src/components/ChatClient.tsx`)

- Vercel AI SDKの`useChat`フックを使用します。
- `api`オプションにプロキシのURL (`NEXT_PUBLIC_OPENAI_PROXY_URL`) を指定します。
- `headers`オプションに認証用の`INTERNAL_TOKEN`を含めます。
- ユーザーの入力を受け取り、プロキシ経由でOpenAI APIに送信し、ストリーミングされる応答をリアルタイムで表示します。

## CORS設定

サーバー側のルートディレクトリにある `middleware.ts` で、`/api/*` へのリクエストに対するCORSヘッダー (Access-Control-Allow-Originなど) を設定しています。これにより、`http://localhost:3001`（クライアント）から`http://localhost:3000`（サーバーAPI）へのクロスオリジンリクエストが許可されます。

## セキュリティ上の注意点

- `OPENAI_API_KEY`はサーバー側の環境変数でのみ管理し、クライアントには露出しません。
- クライアントとサーバーAPI間の通信は`INTERNAL_TOKEN`で保護されています。

