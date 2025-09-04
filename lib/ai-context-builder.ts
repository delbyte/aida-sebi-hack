import { adminDb } from "@/lib/firebase-admin"
import { Memory } from "./ai-memory-manager"

export interface AIContext {
  userProfile: any
  recentFinances: any[]
  relevantMemories: Memory[]
  financialSummary: FinancialSummary
  conversationHistory: string
}

export interface FinancialSummary {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  topCategories: Array<{ category: string, amount: number }>
  monthlyTrend: Array<{ month: string, income: number, expenses: number }>
  aiGeneratedEntries: number
}

/**
 * Build comprehensive context for AI responses
 */
export async function buildAIContext(
  userId: string,
  conversationTopic: string,
  recentMessages: Array<{ role: string, content: string }> = []
): Promise<AIContext> {
  try {
    console.log('🔍 Building comprehensive AI context for user:', userId)

    // Get user profile
    const profile = await getUserProfile(userId)
    console.log('👤 User profile:', profile)

    // Get recent finances (last 30 days)
    const recentFinances = await getRecentFinances(userId, 30)
    console.log('💰 Recent finances:', recentFinances.length, 'entries')

    // Get relevant memories
    const relevantMemories = await getRelevantMemoriesForContext(userId, conversationTopic)
    console.log('🧠 Relevant memories:', relevantMemories.length, 'entries')

    // Generate financial summary
    const financialSummary = await generateFinancialSummary(userId, recentFinances)
    console.log('📊 Financial summary:', financialSummary)

    // Build conversation history summary
    const conversationHistory = summarizeConversationHistory(recentMessages)
    console.log('💬 Conversation history:', conversationHistory.substring(0, 100) + '...')

    const context: AIContext = {
      userProfile: profile,
      recentFinances,
      relevantMemories,
      financialSummary,
      conversationHistory
    }

    console.log('✅ AI context built successfully:', {
      hasProfile: !!profile,
      financesCount: recentFinances.length,
      memoriesCount: relevantMemories.length,
      conversationLength: conversationHistory.length
    })

    return context

  } catch (error) {
    console.error('❌ Failed to build AI context:', error)
    return {
      userProfile: null,
      recentFinances: [],
      relevantMemories: [],
      financialSummary: {
        totalIncome: 0,
        totalExpenses: 0,
        netSavings: 0,
        topCategories: [],
        monthlyTrend: [],
        aiGeneratedEntries: 0
      },
      conversationHistory: ''
    }
  }
}

/**
 * Get user profile from database
 */
async function getUserProfile(userId: string): Promise<any> {
  try {
    const profileDoc = await adminDb.collection("profiles").doc(userId).get()

    if (!profileDoc.exists) {
      return {
        full_name: "User",
        goals: "Financial management",
        risk_tolerance: 5,
        monthly_income: 0,
        currency: "INR"
      }
    }

    return profileDoc.data()
  } catch (error) {
    console.error('Failed to get user profile:', error)
    return null
  }
}

/**
 * Get recent finances for context
 */
async function getRecentFinances(userId: string, days: number = 30): Promise<any[]> {
  try {
    console.log(`🔍 Fetching recent finances for user ${userId}, last ${days} days`)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    console.log(`📅 Cutoff date: ${cutoffDate.toISOString()}`)

    // Simplified query without complex ordering to avoid index requirements
    const financesRef = adminDb.collection("finances")
      .where("userId", "==", userId)

    const querySnapshot = await financesRef.get()
    console.log(`📊 Found ${querySnapshot.size} total finance documents for user`)

    const finances: any[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const docDate = data.date?.toDate ? data.date.toDate() : new Date(data.date)

      // Filter by date in memory
      if (docDate >= cutoffDate) {
        finances.push({
          id: doc.id,
          ...data,
          date: docDate.toISOString(),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        })
      }
    })

    // Sort by date descending in memory
    finances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    console.log(`✅ Returning ${finances.length} recent finances`)
    return finances.slice(0, 20) // Limit to 20 most recent
  } catch (error) {
    console.error('❌ Failed to get recent finances:', error)
    return []
  }
}

/**
 * Get relevant memories for AI context
 */
async function getRelevantMemoriesForContext(userId: string, conversationTopic: string): Promise<Memory[]> {
  try {
    console.log(`🔍 Fetching relevant memories for user ${userId}, topic: "${conversationTopic}"`)

    // Simplified query to avoid index requirements
    const memoriesRef = adminDb.collection("memories")
      .where("userId", "==", userId)

    const querySnapshot = await memoriesRef.get()
    console.log(`🧠 Found ${querySnapshot.size} total memory documents for user`)

    const memories: Memory[] = []

    querySnapshot.forEach((doc) => {
      const memory = doc.data() as Memory
      // Filter by relevance to conversation topic
      if (isMemoryRelevant(memory, conversationTopic)) {
        memories.push(memory)
      }
    })

    console.log(`✅ Found ${memories.length} relevant memories`)
    return memories.slice(0, 5) // Return top 5 most relevant
  } catch (error) {
    console.error('❌ Failed to get relevant memories:', error)
    return []
  }
}

/**
 * Check if memory is relevant to conversation topic
 */
function isMemoryRelevant(memory: Memory, topic: string): boolean {
  const lowerTopic = topic.toLowerCase()
  const lowerContent = memory.content.toLowerCase()

  // Check keywords
  const keywordMatch = memory.keywords.some(keyword =>
    lowerTopic.includes(keyword) || lowerContent.includes(keyword)
  )

  // Check categories
  const categoryMatch = memory.categories.some(category =>
    lowerTopic.includes(category) || category.includes(lowerTopic.split(' ')[0])
  )

  // Check themes
  const themeMatch = memory.themes.some(theme =>
    lowerTopic.includes(theme)
  )

  // Recent access bonus
  const recentAccess = (Date.now() - memory.last_accessed.getTime()) < (7 * 24 * 60 * 60 * 1000) // 7 days

  return keywordMatch || categoryMatch || themeMatch || recentAccess || memory.importance_score > 7
}

/**
 * Generate financial summary for context
 */
async function generateFinancialSummary(userId: string, recentFinances: any[]): Promise<FinancialSummary> {
  try {
    const summary: FinancialSummary = {
      totalIncome: 0,
      totalExpenses: 0,
      netSavings: 0,
      topCategories: [],
      monthlyTrend: [],
      aiGeneratedEntries: 0
    }

    // Calculate totals from recent finances
    for (const finance of recentFinances) {
      if (finance.type === 'income') {
        summary.totalIncome += finance.amount
      } else if (finance.type === 'expense') {
        summary.totalExpenses += finance.amount
      }

      if (finance.ai_generated) {
        summary.aiGeneratedEntries++
      }
    }

    summary.netSavings = summary.totalIncome - summary.totalExpenses

    // Calculate top categories
    const categoryTotals: { [key: string]: number } = {}
    for (const finance of recentFinances) {
      if (finance.type === 'expense') {
        categoryTotals[finance.category] = (categoryTotals[finance.category] || 0) + finance.amount
      }
    }

    summary.topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }))

    // Generate monthly trend (simplified)
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const lastMonthStr = lastMonth.toISOString().slice(0, 7)

    summary.monthlyTrend = [
      {
        month: lastMonthStr,
        income: summary.totalIncome * 0.8, // Estimate
        expenses: summary.totalExpenses * 0.8
      },
      {
        month: currentMonth,
        income: summary.totalIncome,
        expenses: summary.totalExpenses
      }
    ]

    return summary
  } catch (error) {
    console.error('Failed to generate financial summary:', error)
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netSavings: 0,
      topCategories: [],
      monthlyTrend: [],
      aiGeneratedEntries: 0
    }
  }
}

/**
 * Summarize conversation history for context
 */
function summarizeConversationHistory(messages: Array<{ role: string, content: string }>): string {
  if (messages.length === 0) return ''

  // Take last 5 messages for context
  const recentMessages = messages.slice(-5)

  const summary = recentMessages
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`)
    .join('\n')

  return `Recent conversation:\n${summary}`
}

/**
 * Format context for AI prompt
 */
export function formatContextForAI(context: AIContext): string {
  const parts = []

  // User profile
  if (context.userProfile) {
    parts.push(`USER PROFILE: ${JSON.stringify(context.userProfile)}`)
  }

  // Financial summary
  parts.push(`FINANCIAL SUMMARY:
- Total Income (30 days): ₹${context.financialSummary.totalIncome}
- Total Expenses (30 days): ₹${context.financialSummary.totalExpenses}
- Net Savings: ₹${context.financialSummary.netSavings}
- AI Generated Entries: ${context.financialSummary.aiGeneratedEntries}
- Top Expense Categories: ${context.financialSummary.topCategories.map(c => `${c.category} (₹${c.amount})`).join(', ')}`)

  // Recent finances
  if (context.recentFinances.length > 0) {
    const recentEntries = context.recentFinances.slice(0, 5)
      .map(f => `${f.type}: ₹${f.amount} (${f.category}) - ${f.description}`)
      .join('\n')
    parts.push(`RECENT TRANSACTIONS:\n${recentEntries}`)
  }

  // Relevant memories
  if (context.relevantMemories.length > 0) {
    const memorySummary = context.relevantMemories
      .map(m => `${m.categories.join(', ')}: ${m.content}`)
      .join('\n')
    parts.push(`RELEVANT MEMORIES:\n${memorySummary}`)
  }

  // Conversation history
  if (context.conversationHistory) {
    parts.push(context.conversationHistory)
  }

  return parts.join('\n\n')
}
