import { NextRequest, NextResponse } from 'next/server';
// import OpenAI from 'openai'; // 標準のOpenAI SDKも初期化には使用 - Vercel AI SDKが内部で処理
import { openai as vercelOpenAIProvider } from '@ai-sdk/openai'; // Vercel AI SDKのOpenAIプロバイダを直接 'openai' としてインポートし、リネーム
import { streamText, type CoreMessage } from 'ai'; // Vercel AI SDKのコアストリーミング機能と型
// StreamingTextResponse と OpenAIStream の直接インポートを試みる (バージョンにより異なる)
// もし 'ai' から直接インポートできない場合は、後述の代替案を検討
// import { StreamingTextResponse } from 'ai';
// import { readableFromAsyncIterable } from 'ai';

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

// CORSミドルウェア関数
function setCorsHeaders(response: NextResponse) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', '*'); // 本番環境では具体的なオリジンを指定
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    return response;
}

// CORS Preflight リクエストを処理
export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get('origin') || 'http://localhost:3001'; // デフォルトを設定
    console.log(`[API Route OPTIONS] Origin: ${origin}, Method: ${req.method}`);
    const response = new NextResponse(null, {
        status: 204, // No Content for OPTIONS
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
            'Access-Control-Allow-Credentials': 'true',
        },
    });
    return response;
}

export async function POST(req: NextRequest) {
    const origin = req.headers.get('origin') || 'http://localhost:3001'; // デフォルトを設定
    console.log(`[API Route POST] Origin: ${origin}, Method: ${req.method}`);
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (token !== process.env.INTERNAL_TOKEN) {
            console.log('[API Route POST] Unauthorized access attempt');
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                }
            });
        }

        // messagesの型をCoreMessage[]にキャストまたは検証
        const { messages: rawMessages, model = 'gpt-4', data } = await req.json();
        const messages: CoreMessage[] = rawMessages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            // 必要に応じてtoolInvocationsなどの他のプロパティもマッピング
        }));

        console.log(`[API Route POST] Request received - Model: ${model}, Messages Count: ${messages.length}`);
        if (messages.length > 0 && messages[0].content) {
            console.log(`[API Route POST] First message (preview): ${String(messages[0].content).substring(0, 100)}...`);
        }
        if (data) {
            console.log('[API Route POST] Additional data received:', data);
        }

        const llm = vercelOpenAIProvider.chat(model);

        const result = await streamText({
            model: llm,
            messages: messages,
        });

        console.log('[API Route POST] OpenAI stream via Vercel AI SDK (streamText) initiated');

        const response = result.toDataStreamResponse();

        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');

        return response;

    } catch (e: any) {
        console.error('[API Route POST] Error in POST handler:', e, e.cause || e.stack);
        const errorHeaders = new Headers();
        errorHeaders.set('Content-Type', 'application/json');
        errorHeaders.set('Access-Control-Allow-Origin', origin);
        errorHeaders.set('Access-Control-Allow-Credentials', 'true');

        return new NextResponse(JSON.stringify({ error: e.message || 'An unknown error occurred', details: e.cause || e.stack }), {
            status: e.status || 500,
            headers: errorHeaders
        });
    }
} 