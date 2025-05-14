import ChatClient from '@/components/ChatClient';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-24 bg-gray-50">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-center">OpenAI API クライアント</h1>
        <p className="mb-8 text-center text-gray-600">
          このアプリはサーバー側のプロキシを通じてOpenAI APIと通信します
        </p>
        <ChatClient />
      </div>
    </main>
  );
}
