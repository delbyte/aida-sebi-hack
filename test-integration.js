// Test integration of memory creation components
const { validateMemoryUpdate } = require('./lib/ai-response-parser.ts');

// Test the createBasicMemory function from the chat route
function createBasicMemory(message) {
  console.log('🔍 createBasicMemory called with message:', message);
  console.log('🔍 Message length:', message.length);
  
  // Only skip if the message is too short or generic
  if (message.length < 10 || 
      /^(hi|hello|hey|ok|yes|no|thanks|thank you)$/i.test(message.trim())) {
    console.log('❌ Message too short or generic, skipping memory creation');
    return null;
  }

  // Create a memory for any meaningful conversation
  const memory = {
    content: `User mentioned: "${message}"`,
    category: 'conversation',
    importance: 5, // Default importance, let AI context determine real importance
    isNew: true
  };
  
  console.log('✅ Created basic memory:', memory);
  return memory;
}

// Test with the same message
console.log('=== Testing Integration ===');
const testMessage = "I am a big spender";
console.log('Testing with message:', testMessage);

const memory = createBasicMemory(testMessage);
console.log('Memory created:', !!memory);

if (memory) {
  console.log('Memory details:', memory);
  
  // Test validation
  const isValid = validateMemoryUpdate(memory);
  console.log('Validation passed:', isValid);
  
  if (!isValid) {
    console.log('Validation details:', {
      hasContent: !!memory.content,
      contentNotEmpty: memory.content && memory.content.trim().length > 0,
      hasCategory: !!memory.category,
      importanceValid: memory.importance === undefined || (memory.importance >= 1 && memory.importance <= 10)
    });
  }
}

console.log('=== Test Complete ===');
