import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { method, headers } = request;
    const pathname = request.nextUrl.pathname;
    const origin = headers.get('origin');

    // ミドルウェアが実行されたことを示すログ (すべての対象リクエストで表示されるはず)
    console.log(`[Middleware_Entry] Path: ${pathname}, Method: ${method}, Origin: ${origin}`);

    // OPTIONS リクエストの処理 (プリフライト)
    if (method === 'OPTIONS') {
        console.log(`[Middleware_OPTIONS] Handling OPTIONS for ${pathname}`);
        const response = new NextResponse(null, { status: 204 }); // プリフライトは204 No Contentが一般的
        response.headers.set('Access-Control-Allow-Origin', origin || 'http://localhost:3001');
        response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PUT, PATCH');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Max-Age', '86400'); // 24時間キャッシュ
        console.log('[Middleware_OPTIONS] Response headers set:', Object.fromEntries(response.headers.entries()));
        return response;
    }

    // OPTIONS以外のAPIリクエストの処理 (例: POST)
    console.log(`[Middleware_NonOPTIONS] Handling ${method} for ${pathname}. Passing to next handler.`);
    const response = NextResponse.next(); // APIルートに処理を委譲
    // APIルートからのレスポンスにCORSヘッダーを追加 (APIルート側でも設定推奨)
    response.headers.set('Access-Control-Allow-Origin', origin || 'http://localhost:3001');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    console.log('[Middleware_NonOPTIONS] Added CORS headers to outgoing response for non-OPTIONS request.');
    return response;
}

export const config = {
    matcher: '/api/:path*', // APIルートのみを対象
}; 