import { NextRequest, NextResponse } from 'next/server';

// Edge Runtimeを使用
export const runtime = 'edge';

// プリフライトリクエストを処理
export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get('origin') || '*';
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
            'Access-Control-Max-Age': '86400',
            'Access-Control-Allow-Credentials': 'true',
        },
    });
}

// パスからモデル名とアクションを抽出する関数
function extractModelAndAction(pathname: string): { modelName: string, action: string } {
    // パスは "/api/generativelanguage.googleapis.com/v1beta/models/MODEL_NAME:ACTION" のような形式
    const pathParts = pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];

    // "MODEL_NAME:ACTION" の部分を分割
    const [modelWithAction] = lastPart.split('?'); // クエリパラメータを除去
    const actionMatch = modelWithAction.match(/^(.+):(generateContent|streamGenerateContent)$/);

    if (actionMatch) {
        return {
            modelName: actionMatch[1],
            action: actionMatch[2]
        };
    } else {
        // アクションが指定されていない場合
        return {
            modelName: modelWithAction,
            action: 'generateContent'
        };
    }
}

// Google AI APIのリクエストとレスポンスを処理
export async function POST(req: NextRequest) {
    const origin = req.headers.get('origin') || '*';

    // パスとURLオブジェクトを準備
    const path = req.nextUrl.pathname;
    const url = new URL(req.url);

    // クエリパラメータの取得
    const isSSE = url.searchParams.get('alt') === 'sse';

    try {
        // パスからモデル名とアクションを抽出
        const { modelName, action } = extractModelAndAction(path);

        console.log(`[Google AI] リクエスト受信: Path=${path}, Model=${modelName}, Action=${action}, SSE=${isSSE}`);

        // リクエストからAPIキーを取得
        const authHeader = req.headers.get('authorization');
        const apiKey = authHeader?.startsWith('Bearer ')
            ? authHeader.substring(7)
            : process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (!apiKey) {
            console.error('[Google AI] APIキーがありません');
            return new NextResponse(JSON.stringify({
                error: 'Google AI APIキーがありません。環境変数 GOOGLE_GENERATIVE_AI_API_KEY を設定するか、Authorization ヘッダーを指定してください。'
            }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                }
            });
        }

        // リクエスト本体を取得
        const body = await req.json().catch(() => ({}));

        // ストリーミングフラグの設定（SSEまたはストリーミングアクション）
        const isStreaming = action === 'streamGenerateContent' || isSSE;

        // Google AI APIのエンドポイントURL
        // クエリパラメータからモデル名を削除（すでにパスから抽出しているため）
        const searchParams = new URLSearchParams(url.search);
        searchParams.delete('model');
        const cleanSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${action}${cleanSearch}`;

        console.log(`[Google AI] リクエスト転送: URL=${apiUrl}, Streaming=${isStreaming}`);

        // ストリーミングの場合
        if (isStreaming) {
            // Google AI APIへの接続
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Google AI API エラー: ${response.status} - ${errorText}`);
            }

            // Google APIからのストリームレスポンスをプロキシ
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();

            console.log('[Google AI] ストリームを転送します');

            // レスポンスをストリームとして転送
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('レスポンスボディの読み取りに失敗しました');
            }

            // バックグラウンドでストリームを処理
            (async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            await writer.close();
                            break;
                        }
                        // そのまま転送
                        await writer.write(value);
                    }
                } catch (e) {
                    console.error('[Google AI] ストリーム処理エラー:', e);
                    await writer.abort(e as Error);
                }
            })();

            // ストリームレスポンスを返す
            return new NextResponse(readable, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                },
            });
        } else {
            // 非ストリーミングの場合
            console.log('[Google AI] 標準リクエストを処理');

            const proxyRes = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                body: JSON.stringify(body),
            });

            if (!proxyRes.ok) {
                const errorText = await proxyRes.text();
                throw new Error(`Google AI API エラー: ${proxyRes.status} - ${errorText}`);
            }

            const data = await proxyRes.json();

            return new NextResponse(JSON.stringify(data), {
                status: proxyRes.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                }
            });
        }
    } catch (e: any) {
        console.error('[Google AI] エラー:', e.message, e.stack);
        return new NextResponse(JSON.stringify({
            error: e.message || '不明なエラーが発生しました',
            details: e.stack
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Credentials': 'true',
            }
        });
    }
} 