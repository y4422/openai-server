import { NextRequest, NextResponse } from 'next/server';
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

// OpenAI APIリクエストをプロキシ
export async function POST(req: NextRequest) {
    const origin = req.headers.get('origin') || '*';
    console.log(`[OpenAI Proxy] リクエスト受信: Origin=${origin}, Path=${req.nextUrl.pathname}`);

    try {
        // リクエストからAPIキーを取得
        const authHeader = req.headers.get('authorization');
        const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return new NextResponse(JSON.stringify({ error: 'APIキーがありません' }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                }
            });
        }

        // リクエスト本体を取得
        const body = await req.json();
        console.log(`[OpenAI Proxy] リクエスト本体:`, JSON.stringify(body).substring(0, 200) + '...');

        // チャット完了エンドポイントのストリーミングの場合は特別な処理
        if (req.nextUrl.pathname.endsWith('/chat/completions') && body.stream === true) {
            console.log(`[OpenAI Proxy] ストリーミングモードでチャット完了リクエストを処理: model=${body.model}`);

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

            console.log('[OpenAI Proxy] OpenAI APIからのストリームを転送します');

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
                    console.error('[OpenAI Proxy] ストリーム処理エラー:', e);
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
        }

        // 標準のOpenAI APIへのプロキシ処理（ストリーミングなしの場合）
        console.log('[OpenAI Proxy] 標準APIリクエストを処理');

        // OpenAI APIにリクエストを転送
        const path = req.nextUrl.pathname.replace('/api/openai/v1', '');
        const url = `https://api.openai.com/v1${path}`;

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

    } catch (e: any) {
        console.error('[OpenAI Proxy] エラー:', e.message, e.stack);
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

// OpenAI APIからのGETリクエストもプロキシ
export async function GET(req: NextRequest) {
    const origin = req.headers.get('origin') || '*';
    console.log(`[OpenAI Proxy] GETリクエスト受信: Path=${req.nextUrl.pathname}`);

    try {
        // リクエストからAPIキーを取得
        const authHeader = req.headers.get('authorization');
        const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return new NextResponse(JSON.stringify({ error: 'APIキーがありません' }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                }
            });
        }

        // OpenAI APIにリクエストを転送
        const path = req.nextUrl.pathname.replace('/api/openai/v1', '');
        const url = `https://api.openai.com/v1${path}${req.nextUrl.search}`;

        const proxyRes = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
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

    } catch (e: any) {
        console.error('[OpenAI Proxy] エラー:', e.message, e.stack);
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