"use client"

import * as React from "react"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Message = { role: "user" | "assistant"; content: string }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ChatUI() {
  const { data: profData } = useSWR("/api/profile", fetcher)
  const [messages, setMessages] = React.useState<Message[]>([
    { role: "assistant", content: "Welcome! How can I help with your finances today?" },
  ])
  const [input, setInput] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function send() {
    if (!input.trim()) return
    const next = [...messages, { role: "user" as const, content: input }]
    setMessages(next)
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, profile: profData?.profile }),
      })
      const data = await res.json()
      if (data?.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
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
