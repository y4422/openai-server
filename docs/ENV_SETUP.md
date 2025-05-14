# 環境変数の設定

このアプリケーションを実行するには、以下の環境変数を`.env.local`ファイルに設定する必要があります。

## 必要な環境変数

### `OPENAI_API_KEY`

OpenAIのAPIキー。サーバー側でのみ使用され、クライアントには露出しません。
[OpenAIダッシュボード](https://platform.openai.com/api-keys)から取得できます。

```
OPENAI_API_KEY=sk-your-openai-api-key
```

### `INTERNAL_TOKEN`

クライアントからサーバーへのリクエストを認証するための内部トークン。
任意の安全な文字列を設定してください。

```
INTERNAL_TOKEN=your-internal-token
```

### `NEXT_PUBLIC_OPENAI_PROXY_URL`

クライアント側で使用するプロキシURLです。通常は次のように設定します：

```
NEXT_PUBLIC_OPENAI_PROXY_URL=/api/proxy
```

本番環境では、完全なURLを指定することもできます：

```
NEXT_PUBLIC_OPENAI_PROXY_URL=https://your-domain.com/api/proxy
```

## 環境変数ファイルの例

以下は`.env.local`ファイルの例です：

```
# OpenAI API Key (サーバー側のみで使用)
OPENAI_API_KEY=sk-your-openai-api-key

# 内部認証用トークン
INTERNAL_TOKEN=your-internal-token

# プロキシURL (クライアント側で使用)
NEXT_PUBLIC_OPENAI_PROXY_URL=/api/proxy
``` 