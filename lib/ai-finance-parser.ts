export interface FinanceEntry {
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string
  date: string
  confidence: number
  currency?: string
  payment_method?: string
  merchant?: string
}

export interface ParsedFinanceResult {
  entries: FinanceEntry[]
  confidence: number
  originalMessage: string
}

/**
 * Parse financial information from user messages
 */
export function parseFinanceFromMessage(message: string): ParsedFinanceResult {
  const result: ParsedFinanceResult = {
    entries: [],
    confidence: 0,
    originalMessage: message
  }

  // Convert to lowercase for easier matching
  const lowerMessage = message.toLowerCase()

  // Currency patterns (INR, USD, EUR, etc.)
  const currencyPatterns = [
    /₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/g,  // ₹500, ₹1,000, ₹500.50
    /rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/gi,  // Rs 500, rs. 1000
    /\$(\d+(?:,\d+)*(?:\.\d{2})?)/g,  // $500, $1,000
    /€(\d+(?:,\d+)*(?:\.\d{2})?)/g,  // €500
    /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:rupees?|inr|usd|eur)/gi  // 500 rupees, 1000 INR
  ]

  // Extract all amounts with their positions
  const amounts: Array<{ amount: number, currency: string, start: number, end: number }> = []

  for (const pattern of currencyPatterns) {
    let match
    while ((match = pattern.exec(lowerMessage)) !== null) {
      const amountStr = match[1].replace(/,/g, '')
      const amount = parseFloat(amountStr)
      const currency = detectCurrency(match[0])

      if (!isNaN(amount) && amount > 0) {
        amounts.push({
          amount,
          currency,
          start: match.index,
          end: match.index + match[0].length
        })
      }
    }
  }

  // Remove duplicates and sort by position
  const uniqueAmounts = amounts
    .filter((amount, index, self) =>
      index === self.findIndex(a => a.amount === amount.amount && a.start === amount.start)
    )
    .sort((a, b) => a.start - b.start)

  // If no amounts found, return empty result
  if (uniqueAmounts.length === 0) {
    return result
  }

  // Analyze context for each amount
  for (const amountInfo of uniqueAmounts) {
    const entry = analyzeAmountContext(message, amountInfo, lowerMessage)
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
 * Analyze the context around an amount to determine transaction details
 */
function analyzeAmountContext(
  originalMessage: string,
  amountInfo: { amount: number, currency: string, start: number, end: number },
  lowerMessage: string
): FinanceEntry | null {

  // Get context window around the amount (50 characters before and after)
  const contextStart = Math.max(0, amountInfo.start - 50)
  const contextEnd = Math.min(lowerMessage.length, amountInfo.end + 50)
  const context = lowerMessage.substring(contextStart, contextEnd)

  // Determine transaction type
  const transactionType = determineTransactionType(context)

  // Determine category
  const category = determineCategory(context, transactionType)

  // Extract description
  const description = extractDescription(originalMessage, amountInfo, context)

  // Determine date
  const date = extractDate(context)

  // Calculate confidence score
  const confidence = calculateConfidence(context, amountInfo.amount, transactionType)

  // Only create entry if confidence is above threshold
  if (confidence < 0.5) {
    return null
  }

  return {
    type: transactionType,
    amount: amountInfo.amount,
    category,
    description,
    date,
    confidence,
    currency: amountInfo.currency,
    payment_method: determinePaymentMethod(context),
    merchant: extractMerchant(context)
  }
}

/**
 * Determine if transaction is income or expense
 */
function determineTransactionType(context: string): 'income' | 'expense' {
  // Income keywords
  const incomeKeywords = [
    'received', 'got', 'earned', 'salary', 'income', 'deposit', 'credited',
    'bonus', 'dividend', 'refund', 'reimbursement', 'won', 'prize'
  ]

  // Expense keywords
  const expenseKeywords = [
    'spent', 'paid', 'bought', 'purchased', 'cost', 'fee', 'bill', 'rent',
    'charged', 'debited', 'withdrew', 'gave', 'donated'
  ]

  const incomeScore = incomeKeywords.reduce((score, keyword) =>
    score + (context.includes(keyword) ? 1 : 0), 0)

  const expenseScore = expenseKeywords.reduce((score, keyword) =>
    score + (context.includes(keyword) ? 1 : 0), 0)

  return incomeScore > expenseScore ? 'income' : 'expense'
}

/**
 * Determine transaction category
 */
function determineCategory(context: string, type: 'income' | 'expense'): string {
  const categories = {
    income: {
      salary: ['salary', 'payroll', 'wage', 'compensation'],
      freelance: ['freelance', 'gig', 'contract', 'consulting'],
      business: ['business', 'revenue', 'sales', 'profit'],
      investment: ['dividend', 'interest', 'return', 'capital', 'investment'],
      rental: ['rent', 'rental', 'lease'],
      bonus: ['bonus', 'incentive', 'commission'],
      gift: ['gift', 'present', 'donation', 'received']
    },
    expense: {
      food: ['food', 'restaurant', 'lunch', 'dinner', 'meal', 'grocery', 'snack'],
      transportation: ['taxi', 'uber', 'ola', 'bus', 'train', 'flight', 'travel', 'fuel', 'petrol'],
      entertainment: ['movie', 'game', 'party', 'event', 'concert', 'show'],
      shopping: ['shopping', 'clothes', 'shirt', 'dress', 'shoes', 'watch', 'jewelry', 'frock'],
      utilities: ['electricity', 'water', 'gas', 'internet', 'phone', 'mobile', 'utility', 'bill'],
      rent: ['rent', 'house', 'apartment', 'accommodation'],
      insurance: ['insurance', 'premium', 'policy'],
      medical: ['medical', 'doctor', 'hospital', 'medicine', 'pharmacy', 'health'],
      education: ['education', 'school', 'college', 'course', 'book', 'tuition'],
      household: ['household', 'furniture', 'appliance', 'repair', 'maintenance']
    }
  }

  const categoryList = categories[type]

  for (const [category, keywords] of Object.entries(categoryList)) {
    for (const keyword of keywords) {
      if (context.includes(keyword)) {
        return category
      }
    }
  }

  // Default categories
  return type === 'income' ? 'other_income' : 'miscellaneous'
}

/**
 * Extract description from the message
 */
function extractDescription(originalMessage: string, amountInfo: any, context: string): string {
  // Try to find meaningful description around the amount
  const words = originalMessage.split(' ')
  const amountIndex = originalMessage.toLowerCase().indexOf(amountInfo.currency.toLowerCase())

  if (amountIndex === -1) return 'Transaction'

  // Get words before and after the amount
  const beforeWords = originalMessage.substring(0, amountIndex).trim().split(' ').slice(-3)
  const afterWords = originalMessage.substring(amountIndex + amountInfo.currency.length).trim().split(' ').slice(0, 3)

  const descriptionWords = [...beforeWords, ...afterWords]
    .filter(word => word.length > 2 && !/\d/.test(word))
    .slice(0, 5)

  return descriptionWords.length > 0 ? descriptionWords.join(' ') : 'Transaction'
}

/**
 * Extract date from context
 */
function extractDate(context: string): string {
  const today = new Date()

  // Check for relative dates
  if (context.includes('yesterday')) {
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  if (context.includes('today')) {
    return today.toISOString().split('T')[0]
  }

  if (context.includes('tomorrow')) {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // Default to today
  return today.toISOString().split('T')[0]
}

/**
 * Determine payment method
 */
function determinePaymentMethod(context: string): string {
  const methods = {
    cash: ['cash', 'cash payment'],
    card: ['card', 'credit card', 'debit card', 'atm'],
    upi: ['upi', 'gpay', 'phonepe', 'paytm', 'bhim'],
    net_banking: ['net banking', 'online banking', 'bank transfer'],
    cheque: ['cheque', 'check']
  }

  for (const [method, keywords] of Object.entries(methods)) {
    for (const keyword of keywords) {
      if (context.includes(keyword)) {
        return method
      }
    }
  }

  return 'unknown'
}

/**
 * Extract merchant name
 */
function extractMerchant(context: string): string | undefined {
  // Look for common merchant patterns
  const merchantPatterns = [
    /(?:at|from)\s+([A-Z][a-zA-Z\s]+)(?:\s|$)/g,
    /([A-Z][a-zA-Z\s]+)\s+(?:restaurant|store|shop|mall)/g
  ]

  for (const pattern of merchantPatterns) {
    const match = pattern.exec(context)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return undefined
}

/**
 * Calculate confidence score for the transaction
 */
function calculateConfidence(context: string, amount: number, type: string): number {
  let confidence = 0.5 // Base confidence

  // Explicit financial keywords increase confidence
  const explicitKeywords = ['spent', 'paid', 'bought', 'received', 'got', 'earned', 'cost']
  for (const keyword of explicitKeywords) {
    if (context.includes(keyword)) {
      confidence += 0.2
      break
    }
  }

  // Amount size affects confidence (very small or very large amounts are suspicious)
  if (amount < 10 || amount > 1000000) {
    confidence -= 0.1
  }

  // Clear category keywords increase confidence
  const categoryKeywords = [
    'food', 'shopping', 'transport', 'rent', 'salary', 'bonus',
    'electricity', 'water', 'gas', 'medical', 'education'
  ]
  for (const keyword of categoryKeywords) {
    if (context.includes(keyword)) {
      confidence += 0.1
      break
    }
  }

  // Multiple context clues increase confidence
  const contextClues = ['₹', '$', 'rs', 'paid', 'bought', 'spent']
  let clueCount = 0
  for (const clue of contextClues) {
    if (context.includes(clue)) clueCount++
  }
  confidence += Math.min(clueCount * 0.05, 0.2)

  return Math.max(0, Math.min(1, confidence))
}

/**
 * Detect currency from amount string
 */
function detectCurrency(amountString: string): string {
  const lowerAmount = amountString.toLowerCase()

  if (lowerAmount.includes('₹') || lowerAmount.includes('rs') || lowerAmount.includes('inr')) {
    return 'INR'
  }
  if (lowerAmount.includes('$') || lowerAmount.includes('usd')) {
    return 'USD'
  }
  if (lowerAmount.includes('€') || lowerAmount.includes('eur')) {
    return 'EUR'
  }

  return 'INR' // Default to INR
}
