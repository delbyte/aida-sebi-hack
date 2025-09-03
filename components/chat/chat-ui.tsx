"use client"

import * as React from "react"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

type Message = { role: "user" | "assistant"; content: string }

const fetcher = async (url: string) => {
  const user = auth.currentUser
  if (!user) {
    throw new Error("No authenticated user")
  }

  const idToken = await user.getIdToken()
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${idToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export default function ChatUI() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const { data: profData } = useSWR(userId ? `/api/profile?userId=${userId}` : null, fetcher)
  const [messages, setMessages] = React.useState<Message[]>([
    { role: "assistant", content: "Welcome! How can I help with your finances today?" },
  ])
  const [input, setInput] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null)
    })
    return unsubscribe
  }, [])

  async function send() {
    if (!input.trim() || !userId) return
    const next = [...messages, { role: "user" as const, content: input }]
    setMessages(next)
    setInput("")
    setLoading(true)

    try {
      // Get the current user's ID token
      const user = auth.currentUser
      if (!user) {
        console.error("No authenticated user")
        return
      }

      const idToken = await user.getIdToken()

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ messages: next, profile: profData?.profile }),
      })
      const data = await res.json()
      if (data?.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }])
      }
    } catch (error) {
      console.error("Chat error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-semibold">AI Chat</h2>
        <Link href="/dashboard">
          <Button variant="outline">View Dashboard</Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          {profData?.profile ? (
            <p>
              Personalized to {profData.profile.full_name || "you"} | Goals: {profData.profile.goals || "—"} | Currency:{" "}
              {profData.profile.currency || "—"}
            </p>
          ) : (
            <p>We’ll personalize once your profile is set.</p>
          )}
        </CardContent>
      </Card>
      <div className="space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block rounded-xl px-3 py-2 ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Ask about your bonus, loans, taxes..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={send} disabled={loading}>
          {loading ? "Thinking..." : "Send"}
        </Button>
      </div>
    </div>
  )
}
