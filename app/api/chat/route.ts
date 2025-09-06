import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { headers } from "next/headers"
import { parseFinanceFromMessage, FinanceEntry } from "@/lib/ai-finance-parser"
import { parseMemoryFromMessage, MemoryEntry } from "@/lib/ai-memory-parser"
import { buildMemoryContext, createMemory, updateMemory } from "@/lib/ai-memory-manager"
import { parseAIResponse, validateFinanceEntry, validateMemoryUpdate, validateInvestmentUpdate } from "@/lib/ai-response-parser"
import { buildAIContext, formatContextForAI } from "@/lib/ai-context-builder"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite",
  generationConfig: {
    temperature: 0.1, // Lower temperature for more consistent structured output
    topP: 0.8,
    maxOutputTokens: 2048,
  }
})

async function verifyFirebaseToken() {
  const headersList = headers()
  const authHeader = headersList.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const idToken = authHeader.substring(7) // Remove "Bearer " prefix

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    return decodedToken.uid
  } catch (error) {
    return null
  }
}

export async function POST(req: Request) {
  const startTime = Date.now()

  try {
    console.log('Chat API called at:', new Date().toISOString())

    const userId = await verifyFirebaseToken()
    if (!userId) {
      console.log('Unauthorized request')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('User verified:', userId)

    const body = await req.json().catch(() => ({}))
    const { messages = [], profile: clientProfile } = body

    console.log('Request body parsed, messages count:', messages.length)

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
    const aiContext = await buildAIContext(userId, messages[messages.length - 1]?.content || "", messages)
    const contextSummary = formatContextForAI(aiContext)

    // Enhanced system prompt with COMPREHENSIVE AI finance capabilities
    const system = [
      "You are A.I.D.A., an AI-powered Account Aggregator assistant with access to the user's COMPLETE financial history.",
      "",
      "LANGUAGE HANDLING (CRITICAL):",
      "1. Your response language MUST STRICTLY match the language of the user's LATEST message.",
      "2. If the user's last message is in English, you MUST respond in English, even if the conversation history or financial data contains other languages.",
      "3. If the user's last message is in a vernacular language (Hindi, Tamil, etc.), you MUST respond in that language.",
      "4. If the user mixes languages in their last message, respond in the primary language they used.",
      "5. NEVER switch languages unless the user switches first.",
      "",
      "CRITICAL: You have access to ALL the user's financial data - past investments, income, expenses, transfers, and transactions from their entire history.",
      "",
      "FINANCIAL DATA ACCESS:",
      "- You can see ALL transactions, not just recent ones",
      "- You have access to investment data, loan information, and historical patterns",
      "- You can analyze spending trends across months and years",
      "- You can reference past investments, income sources, and expense categories",
      "- You understand the user's complete financial picture",
      "",
      "When users ask about their finances, you can reference:",
      "- Historical spending patterns and trends",
      "- Past investments and their performance",
      "- Income sources and consistency",
      "- Expense categories and changes over time",
      "- Transfer history and cash flow patterns",
      "- Complete financial timeline and milestones",
      "",
      "FINANCE ENTRY CREATION:",
      "When users mention ANY financial transaction, expense, income, or spending:",
      "1. ONLY create a finance entry if you have CLEAR, SPECIFIC information from the user's LATEST message.",
      "2. CRITICAL: Do NOT create a FINANCE_ENTRY for a transaction already listed in the 'USER FINANCIAL CONTEXT'.",
      "3. Use these EXACT formats at the end of your response:",
      'FINANCE_ENTRY: {"type":"expense","amount":500,"category":"Food","description":"Biryani"}',
      'FINANCE_ENTRY: {"type":"income","amount":50000,"category":"Salary","description":"Monthly salary"}',
      'FINANCE_ENTRY: {"type":"investment","amount":10000,"category":"stocks","description":"Invested in Reliance shares"}',
      "4. IMPORTANT: Only include fields that are EXPLICITLY mentioned or clearly implied.",
      "5. Do NOT guess payment methods, merchants, or other details.",
      "6. Leave fields blank rather than guessing.",
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
      "- ONLY include fields that are clearly mentioned - do not guess or assume",
      "- Leave optional fields out of the JSON rather than guessing",
      "",
      `USER FINANCIAL CONTEXT (COMPLETE HISTORY): ${contextSummary}`,
      "",
      "Respond conversationally first, then add the structured data at the end."
    ].join("\n")

    const prompt = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")

    const result = await Promise.race([
      model.generateContent(`${system}\n\nConversation:\n${prompt}\n\nA.I.D.A.:`),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout')), 25000)
      )
    ]) as any

    // Handle cases where the response might be empty or blocked
    if (!result.response) {
      const feedback = result.promptFeedback;
      const blockReason = feedback?.blockReason || 'Unknown reason';
      const safetyRatings = feedback?.safetyRatings?.map((r: any) => `${r.category}: ${r.probability}`).join(', ') || 'No ratings available';
      const errorMessage = `The AI's response was blocked. Reason: ${blockReason}. [Safety ratings: ${safetyRatings}]`;
      
      console.error('AI response blocked:', feedback);

      return NextResponse.json(
        {
          error: "The AI could not process your request due to safety constraints.",
          details: errorMessage
        },
        { status: 400 } // Bad Request, as the user's prompt was the issue
      );
    }

    let aiResponse = result.response.text()

    // Parse AI response for finance entries and memory updates
    const parsedResponse = parseAIResponse(aiResponse)

    // MANUAL FALLBACK: If AI didn't create structured data, try to detect transactions manually
    if (parsedResponse.financeEntries.length === 0) {
      const userMessage = messages[messages.length - 1]?.content || ""
      const parsedFinances = parseFinanceFromMessage(userMessage)
      if (parsedFinances.entries.length > 0) {
        parsedResponse.financeEntries = parsedFinances.entries
      }
    }

    if (parsedResponse.memoryUpdates.length === 0) {
      const userMessage = messages[messages.length - 1]?.content || ""
      const parsedMemories = parseMemoryFromMessage(userMessage)
      if (parsedMemories.entries.length > 0) {
        // Convert MemoryEntry to MemoryUpdate format
        parsedResponse.memoryUpdates = parsedMemories.entries.map(entry => ({
          content: entry.content,
          category: entry.category,
          importance: entry.importance,
          isNew: true
        }))
      }
    }

    // Create finance entries if found and valid
    const createdFinances = []
    if (parsedResponse.financeEntries.length > 0) {
      for (const entry of parsedResponse.financeEntries) {
        const isValid = validateFinanceEntry(entry)
        
        if (isValid) {
          try {
            // Generate transaction ID
            const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            const transactionDate = entry.date ? (entry.date === 'today' ? new Date() : new Date(entry.date)) : new Date();

            // Validate the parsed date
            if (isNaN(transactionDate.getTime())) {
              console.error(`Invalid date detected for finance entry:`, entry);
              continue; // Skip this entry as the date is invalid
            }

            const financeData = {
              userId,
              transaction_id: transactionId,
              type: entry.type,
              amount: entry.amount,
              currency: entry.currency || 'INR',
              category: entry.category,
              subcategory: entry.category, // Use category as subcategory for now
              description: entry.description,
              merchant: entry.merchant || null,
              
              // Date & Time - Cleaned up and validated
              date: transactionDate,
              month: transactionDate.toISOString().substring(0, 7), // YYYY-MM
              year: transactionDate.getFullYear().toString(),
              
              // AI Context - Updated schema
              ai_generated: true,
              confidence_score: entry.confidence || 0.7,
              source_message: messages[messages.length - 1]?.content || '',
              ai_reasoning: `Auto-detected from conversation: "${messages[messages.length - 1]?.content}"`,
              
              // Additional Metadata - Only set if explicitly provided, otherwise null
              payment_method: entry.payment_method || null,
              tags: [],
              location: null,
              notes: null,
              
              // Investment fields - Only set for investment type
              investment_type: entry.type === 'investment' ? entry.category : null,
              units: null, // Will be set only if explicitly provided
              price_per_unit: null, // Will be set only if explicitly provided
              current_value: entry.type === 'investment' ? entry.amount : null, // For investments, default current_value to amount
              
              // Recurring fields - Only set if explicitly provided
              recurring: false,
              recurring_frequency: null,
              
              // Audit Trail - Updated schema
              createdAt: new Date(),
              updatedAt: new Date(),
              created_by: "ai"
            }

            const docRef = adminDb.collection("finances").doc()
            await docRef.set(financeData)
            
            const createdEntry = { id: docRef.id, ...financeData }
            createdFinances.push(createdEntry)
          } catch (error) {
            // Continue processing other entries
          }
        }
      }
    }

    // Create or update memories if found and valid
    const memoryUpdates = []
    
    if (parsedResponse.memoryUpdates.length > 0) {
      for (const memoryUpdate of parsedResponse.memoryUpdates) {
        const isValid = validateMemoryUpdate(memoryUpdate)
        
        if (isValid) {
          try {
            const memoryId = await createMemory(userId, memoryUpdate.content, {
              category: memoryUpdate.category,
              importance: memoryUpdate.importance,
              source_type: 'conversation',
              source_message: messages[messages.length - 1]?.content
            })

            memoryUpdates.push({
              id: memoryId,
              ...memoryUpdate,
              created: true
            })
          } catch (error) {
            console.error(`Failed to create memory for user ${userId}. Update: ${JSON.stringify(memoryUpdate)}`, error);
            // Continue processing other memories
          }
        }
      }
    }

    // Process investment updates if found and valid
    const investmentUpdates = []
    
    if (parsedResponse.investmentUpdates.length > 0) {
      for (const investmentUpdate of parsedResponse.investmentUpdates) {
        const isValid = validateInvestmentUpdate(investmentUpdate)
        
        if (isValid) {
          try {
            // Find the investment to update
            let investmentQuery = adminDb.collection("finances")
              .where("userId", "==", userId)
              .where("type", "==", "investment")
              .limit(50)

            if (investmentUpdate.investmentId) {
              // Update by ID
              const investmentDoc = await adminDb.collection("finances").doc(investmentUpdate.investmentId).get()
              if (investmentDoc.exists) {
                const investmentData = investmentDoc.data()
                const currentValue = investmentData?.current_value || investmentData?.amount || 0
                
                let newValue: number
                if (investmentUpdate.changeType === 'percentage') {
                  newValue = currentValue * (1 + investmentUpdate.newValue / 100)
                } else {
                  newValue = investmentUpdate.newValue
                }

                await adminDb.collection("finances").doc(investmentUpdate.investmentId).update({
                  current_value: newValue,
                  updatedAt: new Date(),
                  last_value_update: new Date(),
                  value_update_reason: investmentUpdate.reason || 'Updated via AI chat'
                })

                investmentUpdates.push({
                  id: investmentUpdate.investmentId,
                  ...investmentUpdate,
                  updated: true,
                  oldValue: currentValue,
                  newValue: newValue
                })
              }
            } else if (investmentUpdate.investmentName) {
              // Find by name and update the most recent one
              const investmentsSnapshot = await investmentQuery.get()
              const matchingInvestment = investmentsSnapshot.docs
                .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
                .find((inv: any) => 
                  inv.description?.toLowerCase().includes(investmentUpdate.investmentName!.toLowerCase()) ||
                  inv.category?.toLowerCase().includes(investmentUpdate.investmentName!.toLowerCase())
                )

              if (matchingInvestment) {
                const currentValue = matchingInvestment.current_value || matchingInvestment.amount || 0 // Default to 0 to prevent NaN
                if (typeof currentValue !== 'number' || isNaN(currentValue)) {
                  // Skip update if the base value is not a valid number
                  continue;
                }

                let newValue: number
                if (investmentUpdate.changeType === 'percentage') {
                  newValue = currentValue * (1 + investmentUpdate.newValue / 100)
                } else {
                  newValue = investmentUpdate.newValue
                }

                if (typeof newValue !== 'number' || isNaN(newValue)) {
                  // Skip update if the new value is not a valid number
                  continue;
                }

                // Update the investment in database
                await adminDb.collection('finances').doc(matchingInvestment.id).update({
                  current_value: newValue,
                  updatedAt: new Date(),
                  last_value_update: new Date(),
                  value_update_reason: investmentUpdate.reason || 'Updated via AI chat'
                })

                investmentUpdates.push({
                  id: matchingInvestment.id,
                  ...investmentUpdate,
                  updated: true,
                  oldValue: currentValue,
                  newValue: newValue
                })

                // Add update confirmation to AI response
                aiResponse += `\n\n✅ Updated your investment "${matchingInvestment.description}" value to ₹${newValue.toLocaleString()}.`
              }
            }
          } catch (error) {
            // Error updating investment
          }
        }
      }
    }

    // Clean response by removing special formatting
    const cleanReply = parsedResponse.reply

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
    console.error('Chat API error:', error)
    
    // Return a proper error response
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
        isTimeout: error instanceof Error && error.message === 'Gemini API timeout'
      },
      { status: 500 }
    )
  }
}
