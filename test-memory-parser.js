// Test the new memory parser system
const { parseMemoryFromMessage } = require('./lib/ai-memory-parser.ts');

// Test cases
const testCases = [
  {
    message: "I am a big spender",
    expected: { category: 'spending', importance: 7 }
  },
  {
    message: "I need to save more money",
    expected: { category: 'habits', importance: 6 }
  },
  {
    message: "My salary is good",
    expected: { category: 'income', importance: 7 }
  },
  {
    message: "I want to invest in stocks",
    expected: { category: 'investments', importance: 8 }
  },
  {
    message: "I have a loan to pay",
    expected: { category: 'debts', importance: 7 }
  },
  {
    message: "Hello how are you",
    expected: { entries: 0 }
  }
];

console.log('=== Testing Memory Parser ===');

for (const testCase of testCases) {
  console.log(`\nTesting: "${testCase.message}"`);
  const result = parseMemoryFromMessage(testCase.message);
  
  console.log('Result:', {
    entriesCount: result.entries.length,
    confidence: result.confidence,
    entries: result.entries.map(e => ({
      category: e.category,
      importance: e.importance,
      confidence: e.confidence,
      content: e.content.substring(0, 50) + '...'
    }))
  });
  
  if (testCase.expected.entries === 0) {
    console.log('✅ Correctly ignored generic message');
  } else if (result.entries.length > 0) {
    const entry = result.entries[0];
    if (entry.category === testCase.expected.category && entry.importance === testCase.expected.importance) {
      console.log('✅ Correct category and importance detected');
    } else {
      console.log('❌ Mismatch - expected:', testCase.expected, 'got:', { category: entry.category, importance: entry.importance });
    }
  } else {
    console.log('❌ No entries found for meaningful message');
  }
}

console.log('\n=== Test Complete ===');
