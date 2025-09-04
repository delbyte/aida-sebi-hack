import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { headers } from "next/headers"

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
    console.error("Token verification failed:", error)
    return null
  }
}

export async function GET(req: Request) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let baseQuery = adminDb.collection("finances").where("userId", "==", userId)

    // Apply filters - Note: Firestore requires composite indexes for complex queries
    // For now, we'll use a simpler approach that doesn't require additional indexes
    if (category) {
      baseQuery = baseQuery.where("category", "==", category)
    }
    if (type) {
      baseQuery = baseQuery.where("type", "==", type)
    }

    // Only apply date filters if provided, but avoid complex ordering for now
    if (startDate || endDate) {
      if (startDate) {
        baseQuery = baseQuery.where("date", ">=", new Date(startDate))
      }
      if (endDate) {
        baseQuery = baseQuery.where("date", "<=", new Date(endDate))
      }
    }

    // Get all matching documents first, then sort in memory
    const snapshot = await baseQuery.get()
    let allFinances = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to ISO strings for JSON serialization
      date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
    }))

    // Sort by date descending in memory
    allFinances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Apply pagination in memory
    const startIndex = offset
    const endIndex = startIndex + limit
    const finances = allFinances.slice(startIndex, endIndex)

    return NextResponse.json({ finances })
  } catch (error) {
    console.error("Error fetching finances:", error)
    return NextResponse.json({ error: "Failed to fetch finances" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  try {
    // Enhanced finance entry with AI support
    const newFinance = {
      userId,
      transaction_id: body.transaction_id || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: body.type, // 'income' | 'expense' | 'transfer' | 'investment'
      amount: Number(body.amount),
      currency: body.currency || "INR",
      category: body.category,
      subcategory: body.subcategory || null,
      description: body.description,
      merchant: body.merchant || null,

      // Date & Time
      date: body.date ? new Date(body.date) : new Date(),
      month: body.month || new Date().toISOString().slice(0, 7), // YYYY-MM
      year: body.year || new Date().getFullYear(),

      // AI Context
      ai_generated: body.ai_generated || false,
      confidence_score: body.confidence_score ? Number(body.confidence_score) : 1.0,
      source_message: body.source_message || null,
      ai_reasoning: body.ai_reasoning || null,

      // Additional Metadata
      payment_method: body.payment_method || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      recurring: body.recurring || false,
      recurring_frequency: body.recurring_frequency || null,

      // Audit Trail
      createdAt: new Date(),
      updatedAt: new Date(),
      created_by: body.created_by || "user"
    }

    const docRef = adminDb.collection("finances").doc()
    await docRef.set(newFinance)

    console.log(`✅ Finance entry created: ${newFinance.type} - ₹${newFinance.amount} (${newFinance.ai_generated ? 'AI' : 'User'})`)

    return NextResponse.json({
      finance: {
        id: docRef.id,
        ...newFinance,
        date: newFinance.date.toISOString(),
        createdAt: newFinance.createdAt.toISOString(),
        updatedAt: newFinance.updatedAt.toISOString()
      }
    })
  } catch (error) {
    console.error("Error creating finance:", error)
    return NextResponse.json({ error: "Failed to create finance" }, { status: 500 })
  }
}
