"use client"

import * as React from "react"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { CheckCircle, TrendingUp, Brain, AlertCircle, DollarSign, MessageSquare, BarChart3 } from "lucide-react"

type Message = { role: "user" | "assistant"; content: string }

interface ChatResponse {
  reply: string
  financeEntries?: Array<{
    id: string
    type: string
    amount: number
    category: string
    description: string
    ai_generated: boolean
  }>
  memoryUpdates?: Array<{
    id: string
    content: string
    category: string
    created: boolean
  }>
  metadata?: {
    financeParsing: {
      entriesFound: number
      confidence: number
    }
    memoryContext: {
      memoriesUsed: number
      confidence: number
    }
  }
}

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
  const [notifications, setNotifications] = React.useState<Array<{
    id: string
    type: 'finance' | 'memory'
    message: string
    timestamp: Date
  }>>([])

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null)
    })
    return unsubscribe
  }, [])

  // Auto-hide notifications after 5 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => prev.filter(n => Date.now() - n.timestamp.getTime() < 5000))
    }, 1000)
    return () => clearInterval(interval)
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
      const data: ChatResponse = await res.json()

      if (data?.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }])

        // Handle finance entries
        if (data.financeEntries && data.financeEntries.length > 0) {
          data.financeEntries.forEach(entry => {
            const notification = {
              id: `finance-${entry.id}`,
              type: 'finance' as const,
              message: `Added ${entry.type}: ₹${entry.amount} (${entry.category})`,
              timestamp: new Date()
            }
            setNotifications(prev => [notification, ...prev])
          })
        }

        // Handle memory updates
        if (data.memoryUpdates && data.memoryUpdates.length > 0) {
          data.memoryUpdates.forEach(update => {
            const notification = {
              id: `memory-${update.id}`,
              type: 'memory' as const,
              message: update.created
                ? `Learned: ${update.content.substring(0, 50)}...`
                : `Updated memory: ${update.category}`,
              timestamp: new Date()
            }
            setNotifications(prev => [notification, ...prev])
          })
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* AI Capabilities Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        {/* Profile Info */}
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {profData?.profile ? (
              <p>
                Personalized to {profData.profile.full_name || "you"} | Goals: {profData.profile.goals?.primary || "—"} | Currency:{" "}
                {profData.profile.currency || "—"}
              </p>
            ) : (
              <p>We’ll personalize once your profile is set.</p>
            )}
          </CardContent>
        </Card>

        {/* AI Capabilities Cards */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950 dark:to-indigo-950 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Auto Finance Tracking</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Access to your complete financial history - all transactions, investments, income, and expenses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 dark:from-purple-950 dark:to-pink-950 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Memory Learning</span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Learns from your complete financial history and conversation patterns
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-950 dark:to-emerald-950 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">Smart Insights</span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300">
              Provides insights based on your complete financial timeline and patterns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex justify-between">
        </div>

        {/* AI Activity Notifications */}
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map(notification => (
              <Alert key={notification.id} className="border-l-4 border-l-green-500">
                <div className="flex items-center gap-2">
                  {notification.type === 'finance' ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <Brain className="w-4 h-4 text-blue-600" />
                  )}
                  <AlertDescription className="text-sm">
                    {notification.message}
                  </AlertDescription>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Chat Messages */}
        <div className="space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={`inline-block rounded-xl px-3 py-2 max-w-[80%] ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="text-left">
              <div className="inline-block rounded-xl px-3 py-2 bg-muted text-foreground">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  A.I.D.A. is thinking...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask about your complete financial history, investments, spending patterns, or any financial question"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()}>
            {loading ? "Thinking..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  )
}
