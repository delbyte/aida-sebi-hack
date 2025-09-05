import { adminDb } from "@/lib/firebase-admin"

export interface Memory {
  userId: string
  content: string
  summary?: string
  categories: string[]
  importance_score: number
  confidence_score: number
  last_accessed: Date
  access_count: number
  source_type: 'conversation' | 'transaction_analysis' | 'profile_data' | 'external_data'
  source_message?: string
  derived_from?: string[]
  valid_from?: Date
  valid_until?: Date
  is_temporal: boolean
  keywords: string[]
  sentiment: 'positive' | 'negative' | 'neutral'
  themes: string[]
  createdAt: Date
  updatedAt: Date
  created_by: 'ai_system'
}

export interface MemoryUpdate {
  content: string
  category?: string
  importance?: number
  reason?: string
  isNew?: boolean
}

export interface MemoryContext {
  userId: string
  relevantMemories: Memory[]
  contextSummary: string
  confidence: number
}

/**
 * Create a new memory for a user
 */
export async function createMemory(
  userId: string,
  content: string,
  options: {
    category?: string
    importance?: number
    source_type?: Memory['source_type']
    source_message?: string
    derived_from?: string[]
    is_temporal?: boolean
  } = {}
): Promise<string> {
  try {
    const memoryId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const memory: Memory = {
      userId,
      content,
      summary: generateSummary(content),
      categories: options.category ? [options.category] : ['general'],
      importance_score: options.importance || 5,
      confidence_score: 0.8,
      last_accessed: new Date(),
      access_count: 0,
      source_type: options.source_type || 'conversation',
      source_message: options.source_message,
      derived_from: options.derived_from,
      is_temporal: options.is_temporal || false,
      keywords: extractKeywords(content),
      sentiment: analyzeSentiment(content),
      themes: extractThemes(content),
      createdAt: new Date(),
      updatedAt: new Date(),
      created_by: 'ai_system'
    }

    const memoryRef = adminDb.collection("memories").doc(memoryId)
    await memoryRef.set(memory)

    return memoryId

  } catch (error) {
    throw error
  }
}

/**
 * Update an existing memory
 */
export async function updateMemory(
  userId: string,
  memoryId: string,
  updates: Partial<Memory>
): Promise<boolean> {
  try {
    const memoryRef = adminDb.collection("memories").doc(memoryId)
    const memorySnap = await memoryRef.get()

    if (!memorySnap.exists) {
      return false
    }

    const currentMemory = memorySnap.data() as Memory

    // Merge updates with current data
    const updatedMemory: Partial<Memory> = {
      ...currentMemory,
      ...updates,
      updatedAt: new Date(),
      access_count: (currentMemory.access_count || 0) + 1,
      last_accessed: new Date()
    }

    await memoryRef.update(updatedMemory)

    return true

  } catch (error) {
    return false
  }
}

/**
 * Get all memories for a user
 */
export async function getUserMemories(userId: string): Promise<Memory[]> {
  try {
    const memoriesRef = adminDb.collection("memories")
    const querySnapshot = await memoriesRef.where("userId", "==", userId).get()

    const memories: Memory[] = []
    querySnapshot.forEach((doc) => {
      memories.push(doc.data() as Memory)
    })

    // Sort by importance and recency
    return memories.sort((a, b) => {
      const scoreA = (a.importance_score * 0.4) + (a.access_count * 0.3) + (a.confidence_score * 0.3)
      const scoreB = (b.importance_score * 0.4) + (b.access_count * 0.3) + (b.confidence_score * 0.3)
      return scoreB - scoreA
    })

  } catch (error) {
    return []
  }
}

/**
 * Get relevant memories for a conversation context
 */
export async function getRelevantMemories(
  userId: string,
  conversationTopic: string,
  limit: number = 5
): Promise<Memory[]> {
  try {
    const allMemories = await getUserMemories(userId)

    // Filter and score memories based on relevance
    const scoredMemories = allMemories.map(memory => ({
      memory,
      score: calculateRelevanceScore(memory, conversationTopic)
    }))

    // Sort by relevance score and return top results
    return scoredMemories
      .filter(item => item.score > 0.3) // Minimum relevance threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.memory)

  } catch (error) {
    return []
  }
}

/**
 * Build comprehensive memory context for AI
 */
export async function buildMemoryContext(
  userId: string,
  conversationTopic: string
): Promise<MemoryContext> {
  try {
    const relevantMemories = await getRelevantMemories(userId, conversationTopic, 10)

    // Generate context summary
    const contextSummary = relevantMemories
      .map(memory => `${memory.categories.join(', ')}: ${memory.content}`)
      .join('\n')

    // Calculate overall confidence
    const avgConfidence = relevantMemories.length > 0
      ? relevantMemories.reduce((sum, mem) => sum + mem.confidence_score, 0) / relevantMemories.length
      : 0

    return {
      userId,
      relevantMemories,
      contextSummary,
      confidence: avgConfidence
    }

  } catch (error) {
    return {
      userId,
      relevantMemories: [],
      contextSummary: '',
      confidence: 0
    }
  }
}

/**
 * Consolidate conflicting memories
 */
export async function consolidateMemories(
  userId: string,
  memoryIds: string[],
  consolidatedContent: string
): Promise<boolean> {
  try {
    // Create new consolidated memory
    const consolidatedId = await createMemory(userId, consolidatedContent, {
      category: 'consolidated',
      importance: 8,
      source_type: 'conversation'
    })

    // Mark old memories as consolidated
    for (const memoryId of memoryIds) {
      await updateMemory(userId, memoryId, {
        content: `[CONSOLIDATED INTO: ${consolidatedId}] ${consolidatedContent}`,
        categories: ['consolidated'],
        importance_score: 1
      })
    }

    return true

  } catch (error) {
    return false
  }
}

/**
 * Clean up old or irrelevant memories
 */
export async function cleanupMemories(userId: string): Promise<number> {
  try {
    const allMemories = await getUserMemories(userId)
    let cleanedCount = 0

    for (const memory of allMemories) {
      // Remove memories that are:
      // 1. Very old and rarely accessed
      // 2. Have very low importance and confidence
      // 3. Are temporal and have expired

      const isOld = (Date.now() - memory.createdAt.getTime()) > (365 * 24 * 60 * 60 * 1000) // 1 year
      const rarelyAccessed = memory.access_count < 2
      const lowImportance = memory.importance_score < 3
      const lowConfidence = memory.confidence_score < 0.4
      const expired = memory.is_temporal && memory.valid_until && memory.valid_until < new Date()

      if ((isOld && rarelyAccessed) || lowImportance || lowConfidence || expired) {
        const memoryRef = adminDb.collection("memories").doc(`${userId}_${memory.createdAt.getTime()}`)
        await memoryRef.delete()
        cleanedCount++
      }
    }

    return cleanedCount

  } catch (error) {
    return 0
  }
}

// Helper Functions

function generateSummary(content: string): string {
  // Simple summary generation - take first 100 characters
  return content.length > 100 ? content.substring(0, 100) + '...' : content
}

function extractKeywords(content: string): string[] {
  const words = content.toLowerCase().split(/\W+/)
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']

  return words
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
    .slice(0, 10) // Limit to 10 keywords
}

function analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'enjoy']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'worst', 'poor', 'horrible']

  const lowerContent = content.toLowerCase()
  const positiveCount = positiveWords.reduce((count, word) => count + (lowerContent.includes(word) ? 1 : 0), 0)
  const negativeCount = negativeWords.reduce((count, word) => count + (lowerContent.includes(word) ? 1 : 0), 0)

  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}

function extractThemes(content: string): string[] {
  const themes = []
  const lowerContent = content.toLowerCase()

  // Financial themes
  if (lowerContent.includes('saving') || lowerContent.includes('save')) themes.push('saving')
  if (lowerContent.includes('investment') || lowerContent.includes('invest')) themes.push('investment')
  if (lowerContent.includes('budget') || lowerContent.includes('expense')) themes.push('budgeting')
  if (lowerContent.includes('debt') || lowerContent.includes('loan')) themes.push('debt_management')
  if (lowerContent.includes('salary') || lowerContent.includes('income')) themes.push('income')
  if (lowerContent.includes('shopping') || lowerContent.includes('spending')) themes.push('spending')

  // Behavioral themes
  if (lowerContent.includes('habit') || lowerContent.includes('routine')) themes.push('habits')
  if (lowerContent.includes('goal') || lowerContent.includes('target')) themes.push('goals')
  if (lowerContent.includes('risk') || lowerContent.includes('conservative')) themes.push('risk_tolerance')

  return themes
}

function calculateRelevanceScore(memory: Memory, conversationTopic: string): number {
  let score = 0
  const topic = conversationTopic.toLowerCase()

  // Category relevance
  if (memory.categories.some(cat => topic.includes(cat) || cat.includes(topic.split(' ')[0]))) {
    score += 0.4
  }

  // Keyword relevance
  const keywordMatches = memory.keywords.filter(keyword => topic.includes(keyword)).length
  score += keywordMatches * 0.1

  // Theme relevance
  if (memory.themes.some(theme => topic.includes(theme))) {
    score += 0.3
  }

  // Recency bonus
  const daysSinceAccess = (Date.now() - memory.last_accessed.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceAccess < 7) score += 0.2
  else if (daysSinceAccess < 30) score += 0.1

  // Importance bonus
  score += (memory.importance_score / 10) * 0.2

  return Math.min(1, score)
}
