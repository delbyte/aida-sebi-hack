import ChatUI from "@/components/chat/chat-ui"
import { PageLayout } from "@/components/page-layout"

export default function ChatPage() {
  return (
    <PageLayout
      title="Chat with A.I.D.A."
      description="Have a conversation with your personalized AI assistant about your finances"
      maxWidth="max-w-5xl"
    >
      <ChatUI />
    </PageLayout>
  )
}
