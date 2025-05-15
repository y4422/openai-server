import { NextRequest, NextResponse } from 'next/server';
import { openai as vercelOpenAIProvider } from '@ai-sdk/openai';
import { streamText, type CoreMessage } from 'ai';
import OpenAI from 'openai';

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

// チャット完了エンドポイント専用ハンドラー
export async function POST(req: NextRequest) {
    const origin = req.headers.get('origin') || '*';
    console.log(`[OpenAI Chat Completions] リクエスト受信: Origin=${origin}`);

    try {
        // リクエストからAPIキーを取得
        const authHeader = req.headers.get('authorization');
        const envApiKey = process.env.OPENAI_API_KEY;

        // APIキーの取得と取得元を特定
        let apiKey = null;
        if (authHeader?.startsWith('Bearer ')) {
            apiKey = authHeader.substring(7);
            console.log('[OpenAI Chat Completions] Authorization ヘッダーからAPIキーを取得しました');
        } else if (envApiKey) {
            apiKey = envApiKey;
            console.log('[OpenAI Chat Completions] 環境変数からAPIキーを取得しました');
        }

        if (!apiKey) {
            console.error('[OpenAI Chat Completions] APIキーがありません');
            return new NextResponse(JSON.stringify({
                error: 'OpenAI APIキーがありません。環境変数 OPENAI_API_KEY を設定するか、Authorization ヘッダーを指定してください。'
            }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                }
            });
        }

        // リクエスト本体を解析
        const body = await req.json();
        const { messages: rawMessages, model = 'gpt-4', stream = true, temperature, max_tokens, top_p, frequency_penalty, presence_penalty } = body;

        console.log(`[OpenAI Chat Completions] モデル: ${model}, ストリーミング: ${stream}`);

        // ストリーミングモードの場合は、OpenAI APIに直接リクエストを転送
        if (stream) {
            console.log('[OpenAI Chat Completions] ストリーミングモードでリクエストを処理');

            // OpenAI APIに直接リクエスト
            const url = 'https://api.openai.com/v1/chat/completions';

            // OpenAI APIへの接続
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'text/event-stream',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API エラー: ${response.status} - ${errorText}`);
            }

            // OpenAI APIからのストリームレスポンスをプロキシ
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();

            console.log('[OpenAI Chat Completions] OpenAI APIからのストリームを転送します');

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
                    console.error('[OpenAI Chat Completions] ストリーム処理エラー:', e);
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
            // 非ストリーミングモードの場合は、OpenAI APIに直接転送
            console.log('[OpenAI Chat Completions] 非ストリーミングモードでリクエストを処理');
            const url = 'https://api.openai.com/v1/chat/completions';

            const proxyRes = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(body),
            });

            if (!proxyRes.ok) {
                const errorText = await proxyRes.text();
                throw new Error(`OpenAI API エラー: ${proxyRes.status} - ${errorText}`);
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
        console.error('[OpenAI Chat Completions] エラー:', e.message, e.stack);
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