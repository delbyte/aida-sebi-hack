import ChatUI from "@/components/chat/chat-ui"

export default function ChatPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Chat with A.I.D.A.</h1>
        <ChatUI />
      </div>
    </main>
  )
}
