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
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      {/* Chat Area */}
      <div className="lg:col-span-3 flex flex-col h-full">
        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 flex flex-col gap-4 p-4 h-full">
            <div className="h-[600px] overflow-y-auto pr-4 space-y-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${
                    m.role === "user" ? "justify-end" : ""
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      A
                    </div>
                  )}
                  <div
                    className={`rounded-xl px-3 py-2 max-w-[80%] ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    <div className="text-xs opacity-60 mt-1">
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  {m.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
                      {profData?.profile?.full_name?.[0] || "U"}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    A
                  </div>
                  <div className="rounded-xl px-3 py-2 bg-muted text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
                      A.I.D.A. is thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-auto pt-4 border-t">
              <Input
                placeholder="Ask about your finances, investments, or spending patterns..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={send} disabled={loading || !input.trim()}>
                <MessageSquare className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Capabilities & Profile Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-3">Your Profile</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              {profData?.profile ? (
                <>
                  <p>
                    <span className="font-medium text-foreground">Name:</span>{" "}
                    {profData.profile.full_name || "—"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Goals:</span>{" "}
                    {profData.profile.goals?.primary || "—"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Currency:</span>{" "}
                    {profData.profile.currency || "—"}
                  </p>
                </>
              ) : (
                <p>We’ll personalize once your profile is set.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-3">AI Capabilities</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 mt-1 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Auto Finance Tracking</p>
                  <p className="text-xs text-muted-foreground">
                    Access your complete financial history.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 mt-1 text-purple-500" />
                <div>
                  <p className="font-medium text-sm">Memory Learning</p>
                  <p className="text-xs text-muted-foreground">
                    Learns from your conversations.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 mt-1 text-green-500" />
                <div>
                  <p className="font-medium text-sm">Smart Insights</p>
                  <p className="text-xs text-muted-foreground">
                    Provides insights based on your data.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {notifications.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-3">Live AI Activity</h3>
              <div className="space-y-2">
                {notifications.map(notification => (
                  <Alert key={notification.id} className="border-l-4 border-l-green-500 text-xs p-2">
                    <div className="flex items-center gap-2">
                      {notification.type === 'finance' ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <Brain className="w-4 h-4 text-blue-600" />
                      )}
                      <AlertDescription>
                        {notification.message}
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
