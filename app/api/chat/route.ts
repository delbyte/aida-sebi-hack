import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { headers } from "next/headers"
import { parseFinanceFromMessage, FinanceEntry } from "@/lib/ai-finance-parser"
import { buildMemoryContext, createMemory, updateMemory } from "@/lib/ai-memory-manager"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

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

    // Build comprehensive memory context
    console.log('🧠 Building memory context...')
    const memoryContext = await buildMemoryContext(userId, messages[messages.length - 1]?.content || "")
    console.log('🧠 Memory context built:', { memoryCount: memoryContext.relevantMemories.length })

    // Enhanced system prompt with AI finance capabilities
    const system = [
      "You are A.I.D.A., an AI-powered Account Aggregator assistant with advanced financial tracking capabilities.",
      "",
      "FINANCE TRACKING CAPABILITIES:",
      "- Automatically identify and create financial entries from user conversations",
      "- Categorize transactions appropriately (income: salary, freelance, bonus, etc.)",
      "- Extract amounts, dates, and descriptions from natural language",
      "- Handle multiple transactions in a single message",
      "- Maintain transaction history and patterns",
      "",
      "FINANCE ENTRY FORMAT:",
      "When creating finance entries, use this exact format:",
      "FINANCE_ENTRY: {",
      '  "type": "income|expense",',
      '  "amount": <number>,',
      '  "category": "<appropriate_category>",',
      '  "description": "<brief_description>",',
      '  "date": "<YYYY-MM-DD or today or yesterday>",',
      '  "confidence": <0-1>',
      "}",
      "",
      "Multiple entries:",
      "FINANCE_ENTRY_MULTIPLE: [",
      "  {entry1}, {entry2}, ...",
      "]",
      "",
      "MEMORY MANAGEMENT:",
      "- Create new memories for fundamental financial habits and patterns",
      "- Update existing memories when user behavior changes",
      "- Reference relevant memories in responses",
      "- Use UPDATE_MEMORY format for memory updates",
      "",
      "MEMORY CREATION CRITERIA:",
      "- Spending habits (e.g., 'prefers cash for small purchases')",
      "- Saving patterns (e.g., 'maintains emergency fund')",
      "- Investment preferences (e.g., 'conservative investor')",
      "- Risk behavior (e.g., 'takes calculated risks')",
      "- Life events (e.g., 'recently bought a house')",
      "",
      "UPDATE_MEMORY FORMAT:",
      'UPDATE_MEMORY: {"content": "memory content", "category": "category", "importance": 1-10}',
      "",
      `USER PROFILE: ${JSON.stringify(profile)}`,
      `MEMORY CONTEXT: ${memoryContext.contextSummary}`,
      "",
      "RESPONSE GUIDELINES:",
      "- Be empathetic and SEBI-compliant",
      "- Provide actionable financial advice",
      "- Keep responses concise but informative",
      "- Reference user's memory and profile in responses",
      "- End with finance entries or memory updates if applicable"
    ].join("\n")

    const prompt = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")

    console.log('🤖 Generating AI response...')
    const result = await model.generateContent(`${system}\n\nConversation:\n${prompt}\n\nA.I.D.A.:`)
    const aiResponse = result.response.text()

    console.log('✅ AI response generated:', aiResponse.substring(0, 200) + '...')

    // Parse AI response for finance entries
    console.log('💰 Parsing for finance entries...')
    const financeResult = parseFinanceFromMessage(aiResponse)
    console.log('💰 Finance parsing result:', {
      entriesFound: financeResult.entries.length,
      confidence: financeResult.confidence
    })

    // Create finance entries if found
    const createdFinances = []
    if (financeResult.entries.length > 0 && financeResult.confidence > 0.6) {
      for (const entry of financeResult.entries) {
        try {
          const financeData = {
            userId,
            type: entry.type,
            amount: entry.amount,
            category: entry.category,
            description: entry.description,
            date: entry.date,
            currency: entry.currency,
            payment_method: entry.payment_method,
            merchant: entry.merchant,
            ai_generated: true,
            confidence_score: entry.confidence,
            source_message: messages[messages.length - 1]?.content,
            ai_reasoning: `Auto-detected from conversation: "${messages[messages.length - 1]?.content}"`,
            tags: [],
            created_by: "ai"
          }

          const docRef = adminDb.collection("finances").doc()
          await docRef.set(financeData)
          createdFinances.push({ id: docRef.id, ...financeData })

          console.log(`✅ AI-created finance entry: ${entry.type} ₹${entry.amount} (${entry.category})`)
        } catch (error) {
          console.error('❌ Failed to create finance entry:', error)
        }
      }
    }

    // Parse for memory updates
    console.log('🧠 Parsing for memory updates...')
    const memoryUpdateMatch = aiResponse.match(/UPDATE_MEMORY:\s*(\{[\s\S]*?\})/)
    let memoryUpdate = null

    if (memoryUpdateMatch) {
      try {
        memoryUpdate = JSON.parse(memoryUpdateMatch[1])
        console.log('🧠 Memory update parsed:', memoryUpdate)

        // Create or update memory
        const memoryId = await createMemory(userId, memoryUpdate.content, {
          category: memoryUpdate.category,
          importance: memoryUpdate.importance,
          source_type: 'conversation',
          source_message: messages[messages.length - 1]?.content
        })

        console.log(`✅ Memory ${memoryUpdate.isNew ? 'created' : 'updated'}: ${memoryId}`)
      } catch (error) {
        console.error('❌ Failed to parse/create memory update:', error)
      }
    }

    // Clean response by removing special formatting
    const cleanReply = aiResponse
      .replace(/FINANCE_ENTRY:[\s\S]*?}/g, '')
      .replace(/FINANCE_ENTRY_MULTIPLE:[\s\S]*?]/g, '')
      .replace(/UPDATE_MEMORY:[\s\S]*?}/g, '')
      .trim()

    console.log('📤 Sending enhanced chat response')

    return NextResponse.json({
      reply: cleanReply,
      financeEntries: createdFinances,
      memoryUpdate: memoryUpdate,
      metadata: {
        financeParsing: {
          entriesFound: financeResult.entries.length,
          confidence: financeResult.confidence
        },
        memoryContext: {
          memoriesUsed: memoryContext.relevantMemories.length,
          confidence: memoryContext.confidence
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
