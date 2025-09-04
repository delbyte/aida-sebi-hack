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

    // Get ALL finances for comprehensive AI context
    const recentFinances = await getAllFinances(userId)
    console.log('💰 ALL finances loaded:', recentFinances.length, 'entries')

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
 * Get ALL finances for comprehensive AI context (not just recent)
 */
async function getAllFinances(userId: string): Promise<any[]> {
  try {
    console.log(`🔍 Fetching ALL finances for user ${userId} for comprehensive AI context`)

    // Get ALL finance documents for the user (no date limit)
    const financesRef = adminDb.collection("finances")
      .where("userId", "==", userId)

    const querySnapshot = await financesRef.get()
    console.log(`📊 Found ${querySnapshot.size} total finance documents for user`)

    const finances: any[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const docDate = data.date?.toDate ? data.date.toDate() : new Date(data.date)

      finances.push({
        id: doc.id,
        ...data,
        date: docDate.toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      })
    })

    // Sort by date descending (most recent first)
    finances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    console.log(`✅ Returning ${finances.length} total finances for AI context`)
    return finances // Return ALL finances, not limited
  } catch (error) {
    console.error('❌ Failed to get all finances:', error)
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
 * Generate comprehensive financial summary from ALL data
 */
async function generateFinancialSummary(userId: string, allFinances: any[]): Promise<FinancialSummary> {
  try {
    const summary: FinancialSummary = {
      totalIncome: 0,
      totalExpenses: 0,
      netSavings: 0,
      topCategories: [],
      monthlyTrend: [],
      aiGeneratedEntries: 0
    }

    // Calculate totals from ALL finances
    for (const finance of allFinances) {
      if (finance.type === 'income') {
        summary.totalIncome += finance.amount
      } else if (finance.type === 'expense') {
        summary.totalExpenses += finance.amount
      } else if (finance.type === 'transfer') {
        // Handle transfers (could be positive or negative)
        summary.netSavings += finance.amount
      } else if (finance.type === 'investment') {
        // Handle investments
        summary.totalExpenses += finance.amount // Investments are outflows
      }

      if (finance.ai_generated) {
        summary.aiGeneratedEntries++
      }
    }

    summary.netSavings = summary.totalIncome - summary.totalExpenses

    // Calculate top categories from ALL data
    const categoryTotals: { [key: string]: number } = {}
    for (const finance of allFinances) {
      if (finance.type === 'expense' || finance.type === 'investment') {
        const category = finance.category || 'Other'
        categoryTotals[category] = (categoryTotals[category] || 0) + finance.amount
      }
    }

    summary.topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Top 10 categories
      .map(([category, amount]) => ({ category, amount }))

    // Generate monthly trend from ALL data
    const monthlyData: { [key: string]: { income: number, expenses: number, count: number } } = {}

    for (const finance of allFinances) {
      const monthKey = finance.month || new Date(finance.date).toISOString().slice(0, 7)
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0, count: 0 }
      }

      if (finance.type === 'income') {
        monthlyData[monthKey].income += finance.amount
      } else if (finance.type === 'expense' || finance.type === 'investment') {
        monthlyData[monthKey].expenses += finance.amount
      }
      monthlyData[monthKey].count++
    }

    // Sort months and get last 12 months
    summary.monthlyTrend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses
      }))

    return summary
  } catch (error) {
    console.error('Failed to generate comprehensive financial summary:', error)
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

  // Financial summary from ALL data
  parts.push(`COMPREHENSIVE FINANCIAL SUMMARY (ALL TIME):
- Total Income (All Time): ₹${context.financialSummary.totalIncome}
- Total Expenses (All Time): ₹${context.financialSummary.totalExpenses}
- Net Position: ₹${context.financialSummary.netSavings}
- AI Generated Entries: ${context.financialSummary.aiGeneratedEntries}
- Top Expense Categories: ${context.financialSummary.topCategories.map(c => `${c.category} (₹${c.amount})`).join(', ')}
- Monthly Trend (Last 12 months): ${context.financialSummary.monthlyTrend.map(m => `${m.month}: +₹${m.income} -₹${m.expenses}`).join(' | ')}`)

  // ALL finances (not just recent)
  if (context.recentFinances.length > 0) {
    const totalEntries = context.recentFinances.length
    const recentEntries = context.recentFinances.slice(0, 10) // Show more since we have all data
      .map(f => `${f.type}: ₹${f.amount} (${f.category}) - ${f.description} [${new Date(f.date).toLocaleDateString()}]`)
      .join('\n')
    parts.push(`ALL FINANCIAL TRANSACTIONS (${totalEntries} total entries):
${recentEntries}
${totalEntries > 10 ? `... and ${totalEntries - 10} more entries` : ''}`)
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
