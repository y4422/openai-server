'use client';

import { useChat } from '@ai-sdk/react';
import React from 'react';

export default function ChatClient() {
    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
        api: process.env.NEXT_PUBLIC_OPENAI_PROXY_URL, // プロキシAPIのURL
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_TOKEN || ''}`,
        },
        // 初期メッセージやその他のオプションをここに設定可能
        // initialMessages: [],
        // onFinish: (message) => { console.log('Stream finished:', message); },
        // onError: (err) => { console.error('Chat error:', err); }
    });

    return (
        <div className="max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">OpenAI プロキシチャット (Vercel AI SDK)</h2>

            {error && (
                <div className="p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    <p>エラー: {error.message || '不明なエラーが発生しました'}</p>
                </div>
            )}

            <div className="mb-4 h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
                {messages.map(m => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-xl inline-block p-3 rounded-lg shadow ${m.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-800'
                                }`}
                        >
                            <strong className="font-semibold capitalize">{m.role === 'user' ? 'あなた' : 'AI'}: </strong>
                            {/* Vercel AI SDKはcontentが文字列であることを保証していることが多い */}
                            {m.content}
                        </div>
                    </div>
                ))}
                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                    <div className="flex justify-start">
                        <div className="max-w-xl inline-block p-3 rounded-lg shadow bg-gray-200 text-gray-800">
                            <strong className="font-semibold capitalize">AI: </strong>
                            <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-gray-500 mr-1"></span>
                            <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-gray-500 mr-1 delay-75"></span>
                            <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-gray-500 delay-150"></span>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="AIへのメッセージを入力..."
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? '送信中...' : '送信'}
                </button>
            </form>
        </div>
    );
} 