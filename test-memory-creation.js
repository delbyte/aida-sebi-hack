// Test memory creation directly
function createBasicMemory(message) {
  console.log('🔍 createBasicMemory called with message:', message)
  console.log('🔍 Message length:', message.length)
  
  // Only skip if the message is too short or generic
  if (message.length < 10 || 
      /^(hi|hello|hey|ok|yes|no|thanks|thank you)$/i.test(message.trim())) {
    console.log('❌ Message too short or generic, skipping memory creation')
    return null
  }

  // Create a memory for any meaningful conversation
  const memory = {
    content: `User mentioned: "${message}"`,
    category: 'conversation',
    importance: 5,
    isNew: true
  }
  
  console.log('✅ Created basic memory:', memory)
  return memory
}

function validateMemoryUpdate(update) {
  console.log('🔍 Validating memory update:', update)
  
  // Required fields
  if (!update.content || update.content.trim().length === 0) {
    console.log('❌ Validation failed: content missing or empty')
    return false
  }
  if (!update.category) {
    console.log('❌ Validation failed: category missing')
    return false
  }

  // Optional but validated fields
  if (update.importance !== undefined && (update.importance < 1 || update.importance > 10)) {
    console.log('❌ Validation failed: importance out of range')
    return false
  }

  console.log('✅ Validation passed')
  return true
}

// Test the flow
const testMessage = "I am a big spender"
console.log('Testing with message:', testMessage)

const basicMemory = createBasicMemory(testMessage)
if (basicMemory) {
  const isValid = validateMemoryUpdate(basicMemory)
  console.log('Final result - Memory created:', !!basicMemory, 'Valid:', isValid)
} else {
  console.log('Final result - No memory created')
}
