import { FinanceEntry } from "./ai-finance-parser"

export interface ParsedAIResponse {
  reply: string
  financeEntries: FinanceEntry[]
  memoryUpdates: MemoryUpdate[]
  investmentUpdates: InvestmentUpdate[]
  confidence: number
}

export interface MemoryUpdate {
  content: string
  category: string
  importance: number
  reason?: string
  isNew?: boolean
}

export interface InvestmentUpdate {
  investmentId?: string
  investmentName?: string
  newValue: number
  changeType: 'absolute' | 'percentage'
  reason?: string
}

/**
 * Parse AI response for structured data (finance entries, memory updates)
 */
export function parseAIResponse(response: string): ParsedAIResponse {
  const result: ParsedAIResponse = {
    reply: response,
    financeEntries: [],
    memoryUpdates: [],
    investmentUpdates: [],
    confidence: 1.0
  }

  // Parse finance entries
  result.financeEntries = parseFinanceEntries(response)

  // Parse memory updates
  result.memoryUpdates = parseMemoryUpdates(response)

  // Parse investment updates
  result.investmentUpdates = parseInvestmentUpdates(response)

  // Clean the reply by removing structured data markers
  result.reply = cleanResponseText(response)

  // Calculate overall confidence
  if (result.financeEntries.length > 0 || result.memoryUpdates.length > 0 || result.investmentUpdates.length > 0) {
    const financeConfidence = result.financeEntries.length > 0
      ? result.financeEntries.reduce((sum, entry) => sum + entry.confidence, 0) / result.financeEntries.length
      : 1.0

    const memoryConfidence = result.memoryUpdates.length > 0
      ? result.memoryUpdates.reduce((sum, update) => sum + (update.importance / 10), 0) / result.memoryUpdates.length
      : 1.0

    const investmentConfidence = result.investmentUpdates.length > 0 ? 0.9 : 1.0

    result.confidence = (financeConfidence + memoryConfidence + investmentConfidence) / 3
  }

  return result
}

/**
 * Parse finance entries from AI response
 */
function parseFinanceEntries(response: string): FinanceEntry[] {
  const entries: FinanceEntry[] = []

  // Look for FINANCE_ENTRY format
  const singleEntryPattern = /FINANCE_ENTRY:?\s*(\{[\s\S]*?\})/g
  let match

  while ((match = singleEntryPattern.exec(response)) !== null) {
    try {
      const entryData = JSON.parse(match[1])
      const entry: FinanceEntry = {
        type: entryData.type,
        amount: Number(entryData.amount),
        category: entryData.category,
        description: entryData.description || 'Transaction',
        date: entryData.date || new Date().toISOString().split('T')[0],
        confidence: Number(entryData.confidence) || 0.8,
        currency: entryData.currency || 'INR',
        payment_method: entryData.payment_method,
        merchant: entryData.merchant
      }
      entries.push(entry)
    } catch (error) {
      // Failed to parse finance entry
    }
  }

  // Look for FINANCE_ENTRY_MULTIPLE format
  const multipleEntryPattern = /FINANCE_ENTRY_MULTIPLE:?\s*(\[[\s\S]*?\])/g
  while ((match = multipleEntryPattern.exec(response)) !== null) {
    try {
      const entriesData = JSON.parse(match[1])
      for (const entryData of entriesData) {
        const entry: FinanceEntry = {
          type: entryData.type,
          amount: Number(entryData.amount),
          category: entryData.category,
          description: entryData.description || 'Transaction',
          date: entryData.date || new Date().toISOString().split('T')[0],
          confidence: Number(entryData.confidence) || 0.8,
          currency: entryData.currency || 'INR',
          payment_method: entryData.payment_method,
          merchant: entryData.merchant
        }
        entries.push(entry)
      }
    } catch (error) {
      // Failed to parse multiple finance entries
    }
  }

  return entries
}

/**
 * Parse memory updates from AI response
 */
function parseMemoryUpdates(response: string): MemoryUpdate[] {
  const updates: MemoryUpdate[] = []

  // Look for UPDATE_MEMORY format (more flexible patterns)
  const updatePatterns = [
    /UPDATE_MEMORY:?\s*(\{[\s\S]*?\})/g,
    /MEMORY:?\s*(\{[\s\S]*?\})/g,
    /CREATE_MEMORY:?\s*(\{[\s\S]*?\})/g,
    /SAVE_MEMORY:?\s*(\{[\s\S]*?\})/g
  ]

  for (const pattern of updatePatterns) {
    let match
    while ((match = pattern.exec(response)) !== null) {
      try {
        const updateData = JSON.parse(match[1])
        const update: MemoryUpdate = {
          content: updateData.content,
          category: updateData.category || 'general',
          importance: Number(updateData.importance) || 5,
          reason: updateData.reason,
          isNew: updateData.isNew !== false
        }
        updates.push(update)
      } catch (error) {
        // Failed to parse memory update
      }
    }
  }

  return updates
}

/**
 * Parse investment updates from AI response
 */
function parseInvestmentUpdates(response: string): InvestmentUpdate[] {
  const updates: InvestmentUpdate[] = []

  // Look for INVESTMENT_UPDATE format
  const updatePatterns = [
    /INVESTMENT_UPDATE:?\s*(\{[\s\S]*?\})/g,
    /UPDATE_INVESTMENT:?\s*(\{[\s\S]*?\})/g,
    /INVESTMENT_VALUE_UPDATE:?\s*(\{[\s\S]*?\})/g
  ]

  for (const pattern of updatePatterns) {
    let match
    while ((match = pattern.exec(response)) !== null) {
      try {
        const updateData = JSON.parse(match[1])
        const update: InvestmentUpdate = {
          investmentId: updateData.investmentId,
          investmentName: updateData.investmentName,
          newValue: Number(updateData.newValue),
          changeType: updateData.changeType || 'absolute',
          reason: updateData.reason
        }
        updates.push(update)
      } catch (error) {
        // Failed to parse investment update
      }
    }
  }

  return updates
}

/**
 * Clean response text by removing structured data markers
 */
function cleanResponseText(response: string): string {
  let cleanText = response

  // Remove finance entry markers
  cleanText = cleanText.replace(/FINANCE_ENTRY:?\s*\{[\s\S]*?\}/g, '')
  cleanText = cleanText.replace(/FINANCE_ENTRY_MULTIPLE:?\s*\[[\s\S]*?\]/g, '')

  // Remove memory update markers (expanded patterns)
  cleanText = cleanText.replace(/UPDATE_MEMORY:?\s*\{[\s\S]*?\}/g, '')
  cleanText = cleanText.replace(/MEMORY:?\s*\{[\s\S]*?\}/g, '')
  cleanText = cleanText.replace(/CREATE_MEMORY:?\s*\{[\s\S]*?\}/g, '')
  cleanText = cleanText.replace(/SAVE_MEMORY:?\s*\{[\s\S]*?\}/g, '')
  cleanText = cleanText.replace(/CONSOLIDATE_MEMORY:?\s*\{[\s\S]*?\}/g, '')

  // Remove investment update markers
  cleanText = cleanText.replace(/INVESTMENT_UPDATE:?\s*\{[\s\S]*?\}/g, '')
  cleanText = cleanText.replace(/UPDATE_INVESTMENT:?\s*\{[\s\S]*?\}/g, '')
  cleanText = cleanText.replace(/INVESTMENT_VALUE_UPDATE:?\s*\{[\s\S]*?\}/g, '')

  // Clean up extra whitespace and newlines
  cleanText = cleanText.replace(/\n\s*\n/g, '\n') // Remove multiple newlines
  cleanText = cleanText.trim()

  return cleanText
}

/**
 * Validate parsed finance entry
 */
export function validateFinanceEntry(entry: FinanceEntry): boolean {
  // Required fields
  if (!entry.type || !['income', 'expense', 'investment'].includes(entry.type)) return false
  if (!entry.amount || entry.amount <= 0) return false
  if (!entry.category) return false
  if (!entry.description) return false

  // Optional but validated fields
  if (entry.confidence !== undefined && (entry.confidence < 0 || entry.confidence > 1)) return false

  return true
}

/**
 * Validate parsed memory update
 */
export function validateMemoryUpdate(update: MemoryUpdate): boolean {
  // Required fields
  if (!update.content || update.content.trim().length === 0) return false
  if (!update.category) return false

  // Optional but validated fields
  if (update.importance !== undefined && (update.importance < 1 || update.importance > 10)) return false

  return true
}

/**
 * Validate parsed investment update
 */
export function validateInvestmentUpdate(update: InvestmentUpdate): boolean {
  // Required fields
  if (!update.newValue || update.newValue <= 0) return false
  if (!['absolute', 'percentage'].includes(update.changeType)) return false

  // Either investmentId or investmentName must be provided
  if (!update.investmentId && !update.investmentName) return false

  return true
}
