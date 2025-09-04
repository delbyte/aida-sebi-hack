import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { headers } from "next/headers"
import { parseFinanceFromMessage, FinanceEntry } from "@/lib/ai-finance-parser"
import { buildMemoryContext, createMemory, updateMemory } from "@/lib/ai-memory-manager"
import { parseAIResponse, validateFinanceEntry, validateMemoryUpdate } from "@/lib/ai-response-parser"
import { buildAIContext, formatContextForAI } from "@/lib/ai-context-builder"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.1, // Lower temperature for more consistent structured output
    topP: 0.8,
    maxOutputTokens: 2048,
  }
})

// Manual transaction detection functions
function detectFinancialTransactionsManually(message: string): any[] {
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

function createBasicMemory(message: string): any {
  console.log('🔍 createBasicMemory called with message:', message)
  console.log('🔍 Message length:', message.length)
  
  // Always create a memory for any financial conversation
  // Let the AI decide what's important, not rigid patterns
  
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
    importance: 5, // Default importance, let AI context determine real importance
    isNew: true
  }
  
  console.log('✅ Created basic memory:', memory)
  return memory
}

async function verifyFirebaseToken() {
  const headersList = headers()
  const authHeader = headersList.get("authorization")

  console.log('🔍 Chat Auth Debug:', {
    hasAuthHeader: !!authHeader,
    authHeaderStartsWithBearer: authHeader?.startsWith("Bearer "),
    authHeaderLength: authHeader?.length,
  })

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('❌ No valid authorization header')
    return null
  }

  const idToken = authHeader.substring(7) // Remove "Bearer " prefix

  try {
    console.log('🔐 Attempting to verify token in chat...')
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    console.log('✅ Token verified successfully for chat:', { uid: decodedToken.uid, email: decodedToken.email })
    return decodedToken.uid
  } catch (error) {
    console.error('❌ Token verification failed in chat:', error)
    return null
  }
}

export async function POST(req: Request) {
  console.log('📥 POST /api/chat called')

  try {
    const userId = await verifyFirebaseToken()
    if (!userId) {
      console.log('❌ No valid user ID for chat, returning 401')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('✅ User authenticated for chat:', userId)

    const body = await req.json().catch(() => ({}))
    const { messages = [], profile: clientProfile } = body

    console.log('📄 Chat request data:', { messagesCount: messages.length, hasProfile: !!clientProfile })

    // Get user profile from database
    const profileDoc = await adminDb.collection("profiles").doc(userId).get()
    const profile = profileDoc.exists ? profileDoc.data() : {
      full_name: "Demo User",
      goals: "Learn about investing",
      risk_tolerance: 5,
      monthly_income: 50000,
      currency: "INR",
    }

    // Build comprehensive AI context
    console.log('🔍 Building comprehensive AI context...')
    const aiContext = await buildAIContext(userId, messages[messages.length - 1]?.content || "", messages)
    const contextSummary = formatContextForAI(aiContext)
    console.log('🔍 AI context built successfully:', {
      hasProfile: !!aiContext.userProfile,
      financesCount: aiContext.recentFinances.length,
      memoriesCount: aiContext.relevantMemories.length,
      totalIncome: aiContext.financialSummary.totalIncome,
      totalExpenses: aiContext.financialSummary.totalExpenses,
      contextSummaryLength: contextSummary.length,
      contextSummaryPreview: contextSummary.substring(0, 300) + '...'
    })

    // Enhanced system prompt with AI finance capabilities
    const system = [
      "You are A.I.D.A., an AI-powered Account Aggregator assistant.",
      "",
      "CRITICAL: When users mention ANY financial transaction, expense, income, or spending:",
      "1. ALWAYS create a finance entry using this EXACT format at the end of your response:",
      'FINANCE_ENTRY: {"type":"expense","amount":500,"category":"Food","description":"Biryani","date":"today","confidence":0.9}',
      "",
      "2. ALWAYS create a memory for EVERY meaningful conversation using this EXACT format:",
      'UPDATE_MEMORY: {"content":"User mentioned their dad needs to pay them ₹100,000","category":"financial_expectations","importance":7}',
      "",
      "MEMORY CREATION RULES:",
      "- Create memories for financial conversations that are non trivial relative to the individual's data(large spending, large income, large loans, investments, goals)",
      "- Create memories for personal financial habits, preferences, and patterns",
      "- Create memories for important life events affecting finances",
      "- Create memories for future financial plans or expectations",
      "- Use importance 1-10 scale (1=alright, 10=life-changing)",
      "- Categories: spending, income, goals, habits, relationships, expectations, investments, debts",
      "",
      "RULES:",
      "- Put FINANCE_ENTRY and UPDATE_MEMORY at the VERY END of your response",
      "- Use the exact JSON format shown above",
      "- Replace values with actual details from the conversation",
      "- ALWAYS create a memory for every meaningful financial conversation",
      "",
      `USER CONTEXT: ${contextSummary}`,
      "",
      "Respond conversationally first, then add the structured data at the end."
    ].join("\n")

    const prompt = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")

    console.log('🤖 Generating AI response...')
    const result = await model.generateContent(`${system}\n\nConversation:\n${prompt}\n\nA.I.D.A.:`)
    const aiResponse = result.response.text()

    console.log('✅ AI response generated:', aiResponse.substring(0, 500) + '...')
    console.log('🔍 Full AI response for debugging:', aiResponse)
    console.log('🔍 AI response ends with:', aiResponse.slice(-200))

    // Parse AI response for finance entries and memory updates
    console.log('🤖 Parsing AI response for structured data...')
    const parsedResponse = parseAIResponse(aiResponse)
    console.log('🤖 Parsed response:', {
      financeEntries: parsedResponse.financeEntries.length,
      memoryUpdates: parsedResponse.memoryUpdates.length,
      confidence: parsedResponse.confidence,
      financeEntriesDetails: parsedResponse.financeEntries,
      memoryUpdatesDetails: parsedResponse.memoryUpdates
    })

    // MANUAL FALLBACK: If AI didn't create structured data, try to detect transactions manually
    if (parsedResponse.financeEntries.length === 0) {
      console.log('⚠️ No structured finance data found, trying manual detection...')
      const manualEntries = detectFinancialTransactionsManually(messages[messages.length - 1]?.content || "")
      if (manualEntries.length > 0) {
        console.log('✅ Manual detection found entries:', manualEntries)
        parsedResponse.financeEntries = manualEntries
      }
    }

    if (parsedResponse.memoryUpdates.length === 0) {
      console.log('⚠️ No structured memory data found, creating basic memory...')
      const basicMemory = createBasicMemory(messages[messages.length - 1]?.content || "")
      console.log('🔍 Basic memory result:', basicMemory)
      if (basicMemory) {
        console.log('✅ Adding basic memory to parsed response')
        parsedResponse.memoryUpdates = [basicMemory]
      } else {
        console.log('❌ Basic memory creation returned null')
      }
    }

    // Create finance entries if found and valid
    const createdFinances = []
    if (parsedResponse.financeEntries.length > 0) {
      console.log('💰 Creating finance entries:', parsedResponse.financeEntries)
      for (const entry of parsedResponse.financeEntries) {
        console.log('🔍 Validating finance entry:', entry)
        const isValid = validateFinanceEntry(entry)
        console.log('🔍 Validation result:', isValid)
        
        if (isValid) {
          try {
            // Generate transaction ID
            const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            const financeData = {
              userId,
              transaction_id: transactionId,
              type: entry.type,
              amount: entry.amount,
              currency: entry.currency || 'INR',
              category: entry.category,
              subcategory: entry.category, // Use category as subcategory for now
              description: entry.description,
              merchant: entry.merchant || '',
              
              // Date & Time - Updated schema format
              date: entry.date === 'today' ? new Date() : new Date(entry.date),
              month: new Date(entry.date === 'today' ? new Date() : new Date(entry.date)).toISOString().substring(0, 7), // YYYY-MM
              year: new Date(entry.date === 'today' ? new Date() : new Date(entry.date)).getFullYear().toString(),
              
              // AI Context - Updated schema
              ai_generated: true,
              confidence_score: entry.confidence || 0.7,
              source_message: messages[messages.length - 1]?.content || '',
              ai_reasoning: `Auto-detected from conversation: "${messages[messages.length - 1]?.content}"`,
              
              // Additional Metadata - Updated schema
              payment_method: entry.payment_method || 'unknown',
              tags: [],
              location: '',
              notes: '',
              
              // Investment fields (not applicable for income/expense)
              investment_type: null,
              units: null,
              price_per_unit: null,
              
              // Recurring fields
              recurring: false,
              recurring_frequency: null,
              
              // Audit Trail - Updated schema
              createdAt: new Date(),
              updatedAt: new Date(),
              created_by: "ai"
            }

            console.log('📝 Creating finance entry in database:', financeData)
            const docRef = adminDb.collection("finances").doc()
            await docRef.set(financeData)
            
            const createdEntry = { id: docRef.id, ...financeData }
            createdFinances.push(createdEntry)

            console.log(`✅ AI-created finance entry: ${entry.type} ₹${entry.amount} (${entry.category})`)
            console.log('📋 Created entry object:', createdEntry)
          } catch (error) {
            console.error('❌ Failed to create finance entry:', error)
            if (error instanceof Error) {
              console.error('❌ Error details:', error.message)
              console.error('❌ Stack trace:', error.stack)
            }
          }
        } else {
          console.log('⚠️ Invalid finance entry skipped:', entry)
          // Let's see what specifically failed validation
          console.log('🔍 Validation details:', {
            hasType: !!entry.type,
            typeValid: ['income', 'expense'].includes(entry.type),
            hasAmount: !!entry.amount,
            amountValid: entry.amount > 0,
            hasCategory: !!entry.category,
            hasDescription: !!entry.description,
            confidenceValid: entry.confidence === undefined || (entry.confidence >= 0 && entry.confidence <= 1)
          })
        }
      }
    } else {
      console.log('❌ No finance entries found to process')
    }

    // Create or update memories if found and valid
    const memoryUpdates = []
    console.log('🧠 Starting memory processing. Memory updates to process:', parsedResponse.memoryUpdates.length)
    
    if (parsedResponse.memoryUpdates.length > 0) {
      console.log('🧠 Creating memory updates:', parsedResponse.memoryUpdates)
      for (const memoryUpdate of parsedResponse.memoryUpdates) {
        console.log('🔍 Processing memory update:', memoryUpdate)
        console.log('🔍 Validating memory update:', memoryUpdate)
        const isValid = validateMemoryUpdate(memoryUpdate)
        console.log('🔍 Memory validation result:', isValid)
        
        if (isValid) {
          try {
            console.log('📝 Creating memory in database with data:', {
              userId,
              content: memoryUpdate.content,
              category: memoryUpdate.category,
              importance: memoryUpdate.importance,
              source_type: 'conversation',
              source_message: messages[messages.length - 1]?.content
            })
            
            const memoryId = await createMemory(userId, memoryUpdate.content, {
              category: memoryUpdate.category,
              importance: memoryUpdate.importance,
              source_type: 'conversation',
              source_message: messages[messages.length - 1]?.content
            })

            console.log('✅ Memory created successfully with ID:', memoryId)

            memoryUpdates.push({
              id: memoryId,
              ...memoryUpdate,
              created: true
            })

            console.log(`✅ Memory ${memoryUpdate.isNew ? 'created' : 'updated'}: ${memoryId}`)
          } catch (error) {
            console.error('❌ Failed to create/update memory:', error)
            console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
          }
        } else {
          console.log('⚠️ Invalid memory update skipped:', memoryUpdate)
          // Let's see what specifically failed validation
          console.log('🔍 Memory validation details:', {
            hasContent: !!memoryUpdate.content,
            contentNotEmpty: memoryUpdate.content && memoryUpdate.content.trim().length > 0,
            hasCategory: !!memoryUpdate.category,
            importanceValid: memoryUpdate.importance === undefined || (memoryUpdate.importance >= 1 && memoryUpdate.importance <= 10)
          })
        }
      }
    } else {
      console.log('❌ No memory updates found to process')
    }

    // Clean response by removing special formatting
    const cleanReply = parsedResponse.reply

    console.log('📤 Sending enhanced chat response with final data:', {
      createdFinancesCount: createdFinances.length,
      memoryUpdatesCount: memoryUpdates.length,
      originalParsedEntries: parsedResponse.financeEntries.length,
      originalParsedMemories: parsedResponse.memoryUpdates.length
    })

    return NextResponse.json({
      reply: cleanReply,
      financeEntries: createdFinances,
      memoryUpdates: memoryUpdates,
      metadata: {
        financeParsing: {
          entriesFound: parsedResponse.financeEntries.length,
          entriesCreated: createdFinances.length,
          confidence: parsedResponse.confidence
        },
        memoryContext: {
          memoriesUsed: aiContext.relevantMemories.length,
          memoriesCreated: memoryUpdates.length,
          confidence: aiContext.relevantMemories.length > 0
            ? aiContext.relevantMemories.reduce((sum, mem) => sum + mem.confidence_score, 0) / aiContext.relevantMemories.length
            : 0
        }
      }
    })

  } catch (error) {
    console.error('❌ Chat API error:', error)

    // Return a proper error response
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
