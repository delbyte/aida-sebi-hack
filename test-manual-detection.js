// Test script for manual detection functions
const message = "I spent ₹400 on biryani";

// Manual transaction detection function (copied from route.ts)
function detectFinancialTransactionsManually(message) {
  const entries = []
  const lowerMessage = message.toLowerCase()

  // Look for spending patterns
  const spendPatterns = [
    /spent\s+₹?(\d+(?:,\d+)*)/g,
    /paid\s+₹?(\d+(?:,\d+)*)/g,
    /bought.*₹?(\d+(?:,\d+)*)/g,
    /cost.*₹?(\d+(?:,\d+)*)/g,
    /₹?(\d+(?:,\d+)*).*for/g,
  ]

  for (const pattern of spendPatterns) {
    let match
    while ((match = pattern.exec(lowerMessage)) !== null) {
      const amount = parseInt(match[1].replace(/,/g, ''))
      if (amount > 0) {
        // Try to extract category from message
        let category = 'Other'
        if (lowerMessage.includes('food') || lowerMessage.includes('biryani') || lowerMessage.includes('eat')) {
          category = 'Food'
        } else if (lowerMessage.includes('movie') || lowerMessage.includes('cinema') || lowerMessage.includes('entertainment')) {
          category = 'Entertainment'
        } else if (lowerMessage.includes('transport') || lowerMessage.includes('travel') || lowerMessage.includes('bus')) {
          category = 'Transportation'
        }

        entries.push({
          type: 'expense',
          amount: amount,
          category: category,
          description: message.substring(0, 50),
          date: new Date().toISOString().split('T')[0],
          confidence: 0.7,
          currency: 'INR'
        })
      }
    }
  }

  return entries
}

// Validation function (copied from ai-response-parser.ts)
function validateFinanceEntry(entry) {
  // Required fields
  if (!entry.type || !['income', 'expense'].includes(entry.type)) return false
  if (!entry.amount || entry.amount <= 0) return false
  if (!entry.category) return false
  if (!entry.description) return false

  // Optional but validated fields
  if (entry.confidence !== undefined && (entry.confidence < 0 || entry.confidence > 1)) return false

  return true
}

// Test the detection
console.log('Testing message:', message);
const detected = detectFinancialTransactionsManually(message);
console.log('Detected entries:', detected);

if (detected.length > 0) {
  for (const entry of detected) {
    console.log('Entry:', entry);
    console.log('Is valid:', validateFinanceEntry(entry));
  }
}
