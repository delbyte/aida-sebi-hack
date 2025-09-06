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
import { CheckCircle, TrendingUp, TrendingDown, Briefcase, Brain, AlertCircle, DollarSign, MessageSquare, BarChart3 } from "lucide-react"
import ReactMarkdown from "react-markdown"

type Message = { role: "user" | "assistant"; content: string }

interface ChatResponse {
  reply: string
  createdFinanceEntries?: Array<{
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
    financeType?: 'income' | 'expense' | 'investment'
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

    const maxRetries = 2
    let retryCount = 0

    while (retryCount <= maxRetries) {
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

      if (res.ok) {
        const data: ChatResponse = await res.json()

        if (data?.reply) {
          setMessages((m) => [...m, { role: "assistant", content: data.reply }])

          // Handle newly created finance entries
          if (data.createdFinanceEntries && data.createdFinanceEntries.length > 0) {
            data.createdFinanceEntries.forEach(entry => {
              const notification = {
                id: `finance-${entry.id}`,
                type: 'finance' as const,
                message: `Added ${entry.type}: ₹${entry.amount} (${entry.category})`,
                timestamp: new Date(),
                financeType: entry.type as 'income' | 'expense' | 'investment'
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
          setLoading(false)
          return // Success, exit the retry loop
        }
      } else if (res.status === 500) {
        retryCount++
        if (retryCount <= maxRetries) {
          // Wait 1 second before retrying
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue // Retry the loop
        } else {
          // All retries failed, show educational message
          const errorData = await res.json().catch(() => ({}))
          if (errorData.isTimeout) {
            setMessages((m) => [...m, { 
              role: "assistant", 
              content: `Sorry, the AI service is taking longer than expected to respond. This usually happens during peak times. While you wait, here are some great resources to learn more about investing:

## Educational Resources for Retail Investors

### **Indian Financial Education**
- **[Zerodha Varsity](https://zerodha.com/varsity/)** - Free courses on stock market basics, technical analysis, and more
- **[NSE IFSC Learning](https://www.nseifsc.com/learning)** - Comprehensive modules on financial markets
- **[Moneycontrol Message Board](https://mmb.moneycontrol.com/)** - Community discussions and insights

### **Global Learning Platforms**
- **[Khan Academy - Investing](https://www.khanacademy.org/economics-finance-domain/core-finance/pf-investing-101)** - Free investing fundamentals
- **[Investopedia](https://www.investopedia.com/)** - Dictionary and tutorials for financial terms
- **[Coursera - Finance Courses](https://www.coursera.org/browse/business/finance)** - Professional courses from top universities

### **Key Topics to Explore**
- **Portfolio Diversification** - Don't put all eggs in one basket
- **Risk Management** - Understanding volatility and market cycles  
- **Fundamental Analysis** - Evaluating company financials
- **Technical Analysis** - Reading charts and trends

Please try sending your message again in a few moments!` 
            }])
          } else {
            // Show general educational error message
            setMessages((m) => [...m, { 
              role: "assistant", 
              content: `Sorry, our servers are experiencing high traffic right now! While you wait, here are some great resources to learn more about investing:

## Educational Resources for Retail Investors

### **Indian Financial Education**
- **[Zerodha Varsity](https://zerodha.com/varsity/)** - Free courses on stock market basics, technical analysis, and more
- **[NSE IFSC Learning](https://www.nseifsc.com/learning)** - Comprehensive modules on financial markets
- **[Moneycontrol Message Board](https://mmb.moneycontrol.com/)** - Community discussions and insights

### **Global Learning Platforms**
- **[Khan Academy - Investing](https://www.khanacademy.org/economics-finance-domain/core-finance/pf-investing-101)** - Free investing fundamentals
- **[Investopedia](https://www.investopedia.com/)** - Dictionary and tutorials for financial terms
- **[Coursera - Finance Courses](https://www.coursera.org/browse/business/finance)** - Professional courses from top universities

### **Key Topics to Explore**
- **Portfolio Diversification** - Don't put your all eggs in one basket
- **Risk Management** - Understanding volatility and market cycles  
- **Fundamental Analysis** - Evaluating company financials
- **Technical Analysis** - Reading charts and trends

Please try sending your message again in a few moments!` 
            }])
          }
          setLoading(false)
        }
      } else {
        // Handle other errors silently
        setLoading(false)
        return
      }
    } catch (error) {
      retryCount++
      if (retryCount <= maxRetries) {
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue // Retry the loop
      } else {
        // All retries failed, show educational message
        setMessages((m) => [...m, { 
          role: "assistant", 
          content: `Sorry, our servers are experiencing high traffic right now. While you wait, here are some great resources to learn more about investing:

## Educational Resources for Retail Investors

### **Indian Financial Education**
- **[Zerodha Varsity](https://zerodha.com/varsity/)** - Free courses on stock market basics, technical analysis, and more
- **[NSE IFSC Learning](https://www.nseifsc.com/learning)** - Comprehensive modules on financial markets
- **[Moneycontrol Message Board](https://mmb.moneycontrol.com/)** - Community discussions and insights

### **Global Learning Platforms**
- **[Khan Academy - Investing](https://www.khanacademy.org/economics-finance-domain/core-finance/pf-investing-101)** - Free investing fundamentals
- **[Investopedia](https://www.investopedia.com/)** - Dictionary and tutorials for financial terms
- **[Coursera - Finance Courses](https://www.coursera.org/browse/business/finance)** - Professional courses from top universities

### **Key Topics to Explore**
- **Portfolio Diversification** - Don't put all your eggs in one basket!
- **Risk Management** - Understanding volatility and market cycles\.  
- **Fundamental Analysis** - Evaluating company financials\.
- **Technical Analysis** - Reading charts and trends\\.

Please try sending your message again in a few moments!` 
        }])
        setLoading(false)
        return
      }
    } finally {
      setLoading(false)
    }
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
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown
                          components={{
                            a: ({ children, href }) => (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                {children}
                              </a>
                            ),
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0">{children}</p>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-2 last:mb-0 ml-4 list-disc">{children}</ul>
                            ),
                            li: ({ children }) => (
                              <li className="mb-1">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-foreground">{children}</strong>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-lg font-semibold mb-2 mt-4 text-foreground">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-md font-semibold mb-2 mt-3 text-foreground">{children}</h3>
                            )
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
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
                  <Alert key={notification.id} className={`border-l-4 ${
                    notification.financeType === 'income' ? 'border-l-green-500' :
                    notification.financeType === 'expense' ? 'border-l-red-500' :
                    notification.financeType === 'investment' ? 'border-l-blue-500' :
                    'border-l-purple-500' // For memory
                  } text-xs p-2`}>
                    <div className="flex items-center gap-2">
                      {notification.type === 'finance' ? (
                        notification.financeType === 'income' ? <TrendingUp className="w-4 h-4 text-green-600" /> :
                        notification.financeType === 'expense' ? <TrendingDown className="w-4 h-4 text-red-600" /> :
                        <Briefcase className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Brain className="w-4 h-4 text-purple-600" />
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
