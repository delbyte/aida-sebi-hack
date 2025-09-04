export interface MemoryEntry {
  content: string
  category: string
  importance: number
  confidence: number
  source_type?: string
  keywords?: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export interface ParsedMemoryResult {
  entries: MemoryEntry[]
  confidence: number
  originalMessage: string
}

/**
 * Parse memory-worthy information from user messages
 */
export function parseMemoryFromMessage(message: string): ParsedMemoryResult {
  const result: ParsedMemoryResult = {
    entries: [],
    confidence: 0,
    originalMessage: message
  }

  // Convert to lowercase for easier matching
  const lowerMessage = message.toLowerCase()

  // Skip very short or generic messages
  if (message.length < 5 || /^(hi|hello|hey|ok|yes|no|thanks|thank you)$/i.test(message.trim())) {
    return result
  }

  // Memory-worthy patterns (financial behaviors, goals, habits, etc.)
  const memoryPatterns = [
    // Spending patterns
    /big spender/gi,
    /spend a lot/gi,
    /spending too much/gi,
    /expensive taste/gi,
    /love shopping/gi,
    /shopaholic/gi,

    // Saving patterns
    /save money/gi,
    /saving up/gi,
    /frugal/gi,
    /budget/gi,
    /cut expenses/gi,
    /save more/gi,
    /saving/gi,
    /financial discipline/gi,

    // Income patterns
    /income/gi,
    /salary/gi,
    /earn/gi,
    /paycheck/gi,
    /bonus/gi,
    /good pay/gi,
    /high salary/gi,

    // Investment patterns
    /invest/gi,
    /stocks/gi,
    /mutual fund/gi,
    /SIP/gi,
    /portfolio/gi,
    /trading/gi,
    /crypto/gi,

    // Debt patterns
    /loan/gi,
    /debt/gi,
    /owe/gi,
    /borrow/gi,
    /mortgage/gi,
    /credit/gi,
    /EMI/gi,

    // Goal patterns
    /financial goal/gi,
    /investment plan/gi,
    /retire/gi,
    /save for/gi,
    /planning to buy/gi,
    /future planning/gi,

    // Family patterns
    /family/gi,
    /parents/gi,
    /spouse/gi,
    /kids/gi,
    /children/gi,
    /dependents/gi,

    // Housing patterns
    /house/gi,
    /rent/gi,
    /moving/gi,
    /apartment/gi,
    /home/gi,
    /property/gi
  ]

  // Extract all memory patterns with their positions
  const memoryMatches: Array<{ pattern: string, start: number, end: number }> = []

  for (const pattern of memoryPatterns) {
    let match
    while ((match = pattern.exec(lowerMessage)) !== null) {
      memoryMatches.push({
        pattern: match[0],
        start: match.index,
        end: match.index + match[0].length
      })
    }
  }

  // Remove duplicates and sort by position
  const uniqueMatches = memoryMatches
    .filter((match, index, self) =>
      index === self.findIndex(m => m.pattern === match.pattern && m.start === match.start)
    )
    .sort((a, b) => a.start - b.start)

  // If no memory patterns found, check for general financial context
  if (uniqueMatches.length === 0) {
    const isFinanceRelated = /money|financial|₹|dollar|price|cost|buy|sell|pay|spend|earn|save|invest/gi.test(message)

    if (isFinanceRelated && message.length > 10) {
      // Create a general memory for finance-related conversation
      const entry = analyzeMemoryContext(message, { pattern: 'general', start: 0, end: message.length }, lowerMessage)
      if (entry) {
        result.entries.push(entry)
      }
    }

    // Calculate overall confidence
    if (result.entries.length > 0) {
      result.confidence = result.entries.reduce((sum, entry) => sum + entry.confidence, 0) / result.entries.length
    }

    return result
  }

  // Analyze context for each memory pattern
  for (const matchInfo of uniqueMatches) {
    const entry = analyzeMemoryContext(message, matchInfo, lowerMessage)
    if (entry) {
      result.entries.push(entry)
    }
  }

  // Calculate overall confidence
  if (result.entries.length > 0) {
    result.confidence = result.entries.reduce((sum, entry) => sum + entry.confidence, 0) / result.entries.length
  }

  return result
}

/**
 * Analyze the context around a memory pattern to determine memory details
 */
function analyzeMemoryContext(
  originalMessage: string,
  matchInfo: { pattern: string, start: number, end: number },
  lowerMessage: string
): MemoryEntry | null {

  // Get context window around the pattern (50 characters before and after)
  const contextStart = Math.max(0, matchInfo.start - 50)
  const contextEnd = Math.min(lowerMessage.length, matchInfo.end + 50)
  const context = lowerMessage.substring(contextStart, contextEnd)

  // Determine memory category
  const category = determineMemoryCategory(context, matchInfo.pattern)

  // Determine importance
  const importance = determineImportance(context, category)

  // Extract content
  const content = extractMemoryContent(originalMessage, matchInfo, context, category)

  // Calculate confidence score
  const confidence = calculateMemoryConfidence(context, matchInfo.pattern, category)

  // Only create entry if confidence is above threshold
  if (confidence < 0.5) {
    return null
  }

  return {
    content,
    category,
    importance,
    confidence,
    source_type: 'conversation',
    keywords: extractKeywords(originalMessage),
    sentiment: analyzeSentiment(originalMessage)
  }
}

/**
 * Determine memory category based on context and pattern
 */
function determineMemoryCategory(context: string, pattern: string): string {
  const categories = {
    spending: {
      keywords: ['big spender', 'spend a lot', 'spending too much', 'expensive taste', 'love shopping', 'shopaholic'],
      category: 'spending'
    },
    habits: {
      keywords: ['save money', 'saving up', 'frugal', 'budget', 'cut expenses', 'save more', 'saving', 'financial discipline'],
      category: 'habits'
    },
    income: {
      keywords: ['income', 'salary', 'earn', 'paycheck', 'bonus', 'good pay', 'high salary'],
      category: 'income'
    },
    investments: {
      keywords: ['invest', 'stocks', 'mutual fund', 'SIP', 'portfolio', 'trading', 'crypto'],
      category: 'investments'
    },
    debts: {
      keywords: ['loan', 'debt', 'owe', 'borrow', 'mortgage', 'credit', 'EMI'],
      category: 'debts'
    },
    goals: {
      keywords: ['financial goal', 'investment plan', 'retire', 'save for', 'planning to buy', 'future planning'],
      category: 'goals'
    },
    relationships: {
      keywords: ['family', 'parents', 'spouse', 'kids', 'children', 'dependents'],
      category: 'relationships'
    },
    housing: {
      keywords: ['house', 'rent', 'moving', 'apartment', 'home', 'property'],
      category: 'housing'
    }
  }

  for (const [categoryKey, categoryData] of Object.entries(categories)) {
    for (const keyword of categoryData.keywords) {
      if (context.includes(keyword) || pattern.includes(keyword)) {
        return categoryData.category
      }
    }
  }

  return 'conversation'
}

/**
 * Determine importance level based on context and category
 */
function determineImportance(context: string, category: string): number {
  const importanceMap: { [key: string]: number } = {
    'goals': 8,
    'investments': 8,
    'debts': 7,
    'spending': 7,
    'income': 7,
    'housing': 7,
    'relationships': 6,
    'habits': 6,
    'conversation': 5
  }

  let importance = importanceMap[category] || 5

  // Increase importance for strong language
  if (context.includes('very') || context.includes('really') || context.includes('extremely')) {
    importance = Math.min(10, importance + 1)
  }

  // Increase importance for future-oriented statements
  if (context.includes('plan') || context.includes('will') || context.includes('going to')) {
    importance = Math.min(10, importance + 1)
  }

  return importance
}

/**
 * Extract meaningful content for the memory
 */
function extractMemoryContent(originalMessage: string, matchInfo: any, context: string, category: string): string {
  const contentPrefixes: { [key: string]: string } = {
    'spending': 'User identified their spending behavior: ',
    'habits': 'User mentioned saving habits: ',
    'income': 'User mentioned income details: ',
    'investments': 'User mentioned investment details: ',
    'debts': 'User mentioned debt situation: ',
    'goals': 'User mentioned financial goals: ',
    'relationships': 'User mentioned family context: ',
    'housing': 'User mentioned housing situation: ',
    'conversation': 'User mentioned: '
  }

  const prefix = contentPrefixes[category] || 'User mentioned: '
  return `${prefix}"${originalMessage}"`
}

/**
 * Calculate confidence score for the memory
 */
function calculateMemoryConfidence(context: string, pattern: string, category: string): number {
  let confidence = 0.5 // Base confidence

  // Explicit financial keywords increase confidence
  const explicitKeywords = ['money', 'financial', '₹', 'dollar', 'spend', 'save', 'earn', 'invest', 'loan', 'debt']
  for (const keyword of explicitKeywords) {
    if (context.includes(keyword)) {
      confidence += 0.2
      break
    }
  }

  // Strong pattern matches increase confidence
  const strongPatterns = ['big spender', 'financial goal', 'investment plan', 'save money']
  for (const strongPattern of strongPatterns) {
    if (pattern.includes(strongPattern)) {
      confidence += 0.3
      break
    }
  }

  // Category-specific keywords increase confidence
  const categoryKeywords: { [key: string]: string[] } = {
    'spending': ['expensive', 'shopping', 'buy', 'purchase'],
    'habits': ['budget', 'discipline', 'regular', 'consistent'],
    'income': ['salary', 'bonus', 'paycheck', 'earn'],
    'investments': ['stocks', 'mutual', 'SIP', 'portfolio'],
    'debts': ['loan', 'EMI', 'mortgage', 'credit'],
    'goals': ['plan', 'future', 'retirement', 'goal'],
    'relationships': ['family', 'parents', 'spouse', 'kids'],
    'housing': ['house', 'rent', 'apartment', 'home']
  }

  const keywords = categoryKeywords[category] || []
  for (const keyword of keywords) {
    if (context.includes(keyword)) {
      confidence += 0.1
      break
    }
  }

  // Multiple context clues increase confidence
  const contextClues = ['very', 'really', 'plan', 'will', 'going to', 'want to']
  let clueCount = 0
  for (const clue of contextClues) {
    if (context.includes(clue)) clueCount++
  }
  confidence += Math.min(clueCount * 0.05, 0.2)

  return Math.max(0, Math.min(1, confidence))
}

/**
 * Extract keywords from message
 */
function extractKeywords(message: string): string[] {
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'them', 'were', 'said'].includes(word))

  return [...new Set(words)].slice(0, 10) // Unique keywords, max 10
}

/**
 * Analyze sentiment of message
 */
function analyzeSentiment(message: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'amazing', 'wonderful', 'excited', 'proud', 'saving', 'investing']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worried', 'stressed', 'scared', 'disappointed', 'frustrated', 'debt', 'loan']

  const lowerMessage = message.toLowerCase()

  const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length
  const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length

  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}
