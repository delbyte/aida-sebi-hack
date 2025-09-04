// Simple test for memory parser patterns
console.log('=== Testing Memory Parser Patterns ===');

// Simulate the memory parser logic
function testMemoryPatterns(message) {
  const lowerMessage = message.toLowerCase();
  
  // Financial behavior patterns
  const patterns = [
    {
      test: /big spender/gi.test(message),
      category: 'spending',
      importance: 7,
      name: 'Big Spender'
    },
    {
      test: /save money|saving/gi.test(message),
      category: 'habits', 
      importance: 6,
      name: 'Saving Habits'
    },
    {
      test: /income|salary|earn/gi.test(message),
      category: 'income',
      importance: 7,
      name: 'Income Related'
    },
    {
      test: /invest|stocks|mutual fund/gi.test(message),
      category: 'investments',
      importance: 8,
      name: 'Investment Related'
    },
    {
      test: /loan|debt|owe/gi.test(message),
      category: 'debts',
      importance: 7,
      name: 'Debt Related'
    }
  ];
  
  for (const pattern of patterns) {
    if (pattern.test) {
      return {
        found: true,
        category: pattern.category,
        importance: pattern.importance,
        pattern: pattern.name
      };
    }
  }
  
  return { found: false };
}

// Test cases
const testCases = [
  "I am a big spender",
  "I need to save more money", 
  "My salary is good",
  "I want to invest in stocks",
  "I have a loan to pay",
  "Hello how are you"
];

for (const message of testCases) {
  console.log(`\nTesting: "${message}"`);
  const result = testMemoryPatterns(message);
  
  if (result.found) {
    console.log(`✅ Pattern found: ${result.pattern} (${result.category}, importance: ${result.importance})`);
  } else {
    console.log('❌ No pattern found');
  }
}

console.log('\n=== Pattern Test Complete ===');
