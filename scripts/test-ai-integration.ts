import { parseFinanceFromMessage } from '../lib/ai-finance-parser'
import { parseAIResponse } from '../lib/ai-response-parser'

// Test cases for AI finance parsing
const testCases = [
  {
    input: "I spent ₹15000 on a beautiful frock today",
    expected: {
      hasEntry: true,
      type: 'expense',
      amount: 15000,
      category: 'shopping'
    }
  },
  {
    input: "Got my salary of ₹100000 this month",
    expected: {
      hasEntry: true,
      type: 'income',
      amount: 100000,
      category: 'salary'
    }
  },
  {
    input: "Paid electricity bill of ₹2500",
    expected: {
      hasEntry: true,
      type: 'expense',
      amount: 2500,
      category: 'utilities'
    }
  },
  {
    input: "Hello, how are you?",
    expected: {
      hasEntry: false
    }
  }
]

// Test AI response parsing
const aiResponseTests = [
  {
    response: `I see you made a purchase. I'll help you track this expense.

FINANCE_ENTRY: {
  "type": "expense",
  "amount": 15000,
  "category": "shopping",
  "description": "Frock purchase",
  "date": "today",
  "confidence": 0.9
}

This looks like a significant expense for clothing.`,
    expected: {
      hasFinanceEntry: true,
      hasMemoryUpdate: false,
      financeAmount: 15000
    }
  },
  {
    response: `Based on your spending patterns, I notice you frequently shop for clothes.

UPDATE_MEMORY: {
  "content": "User frequently makes clothing purchases",
  "category": "spending_habits",
  "importance": 6
}

Would you like me to help you set a clothing budget?`,
    expected: {
      hasFinanceEntry: false,
      hasMemoryUpdate: true,
      memoryCategory: "spending_habits"
    }
  }
]

export function runTests() {
  console.log('🧪 Running AI Integration Tests...\n')

  // Test finance parsing
  console.log('📊 Testing Finance Parsing:')
  testCases.forEach((test, index) => {
    const result = parseFinanceFromMessage(test.input)
    const passed = test.expected.hasEntry
      ? result.entries.length > 0 &&
        result.entries[0].type === test.expected.type &&
        result.entries[0].amount === test.expected.amount
      : result.entries.length === 0

    console.log(`Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'} - "${test.input}"`)
    if (!passed) {
      console.log(`  Expected: ${JSON.stringify(test.expected)}`)
      console.log(`  Got: ${JSON.stringify(result)}`)
    }
  })

  // Test AI response parsing
  console.log('\n🤖 Testing AI Response Parsing:')
  aiResponseTests.forEach((test, index) => {
    const result = parseAIResponse(test.response)
    const passed = test.expected.hasFinanceEntry
      ? result.financeEntries.length > 0
      : result.financeEntries.length === 0

    console.log(`Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'} - AI Response Parsing`)
    if (!passed) {
      console.log(`  Expected finance entries: ${test.expected.hasFinanceEntry}`)
      console.log(`  Got finance entries: ${result.financeEntries.length}`)
    }
  })

  console.log('\n🎉 AI Integration Tests Complete!')
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runTests()
}
