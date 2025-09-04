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
    return null
  }
}

export async function GET(req: Request) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100') // Increased default limit
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const minAmount = searchParams.get('minAmount')
    const maxAmount = searchParams.get('maxAmount')
    const paymentMethod = searchParams.get('paymentMethod')
    const aiGenerated = searchParams.get('aiGenerated')
    const sortBy = searchParams.get('sortBy') || 'date' // date, amount, createdAt
    const sortOrder = searchParams.get('sortOrder') || 'desc' // asc, desc

    let baseQuery = adminDb.collection("finances").where("userId", "==", userId)

    // Apply comprehensive filters
    if (category) {
      baseQuery = baseQuery.where("category", "==", category)
    }
    if (type) {
      baseQuery = baseQuery.where("type", "==", type)
    }
    if (paymentMethod) {
      baseQuery = baseQuery.where("payment_method", "==", paymentMethod)
    }
    if (aiGenerated && aiGenerated.trim() !== '') {
      baseQuery = baseQuery.where("ai_generated", "==", aiGenerated === 'true')
    }

    // Apply date filters if provided
    if (startDate || endDate) {
      try {
        if (startDate) {
          const start = new Date(startDate)
          if (!isNaN(start.getTime())) {
            baseQuery = baseQuery.where("date", ">=", start)
          }
        }
        if (endDate) {
          const end = new Date(endDate)
          if (!isNaN(end.getTime())) {
            baseQuery = baseQuery.where("date", "<=", end)
          }
        }
      } catch (error) {
        // Continue without date filters if dates are invalid
      }
    }

    // Get all matching documents first, then sort and filter in memory for comprehensive queries
    const snapshot = await baseQuery.get()
    let allFinances = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        userId: data.userId,
        transaction_id: data.transaction_id,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        category: data.category,
        subcategory: data.subcategory,
        description: data.description,
        merchant: data.merchant,
        date: data.date?.toDate?.()?.toISOString() || data.date,
        month: data.month,
        year: data.year,
        ai_generated: data.ai_generated,
        confidence_score: data.confidence_score,
        source_message: data.source_message,
        ai_reasoning: data.ai_reasoning,
        payment_method: data.payment_method,
        tags: data.tags,
        location: data.location,
        notes: data.notes,
        investment_type: data.investment_type,
        units: data.units,
        price_per_unit: data.price_per_unit,
        recurring: data.recurring,
        recurring_frequency: data.recurring_frequency,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        created_by: data.created_by
      }
    })

    // Apply amount filters in memory
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (!isNaN(min)) {
        allFinances = allFinances.filter(f => f.amount && f.amount >= min)
      }
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount)
      if (!isNaN(max)) {
        allFinances = allFinances.filter(f => f.amount && f.amount <= max)
      }
    }

    // Sort by specified field and order
    allFinances.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'amount':
          aValue = a.amount || 0
          bValue = b.amount || 0
          break
        case 'createdAt':
          try {
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
          } catch (error) {
            aValue = 0
            bValue = 0
          }
          break
        case 'date':
        default:
          try {
            aValue = a.date ? new Date(a.date).getTime() : 0
            bValue = b.date ? new Date(b.date).getTime() : 0
          } catch (error) {
            aValue = 0
            bValue = 0
          }
          break
      }

      if (sortOrder === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

    // Apply pagination
    const startIndex = offset
    const endIndex = startIndex + limit
    const finances = allFinances.slice(startIndex, endIndex)

    return NextResponse.json({ finances })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch finances" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Validate required fields
  if (!body.type || !body.amount || !body.category) {
    return NextResponse.json({
      error: "Missing required fields",
      details: "type, amount, and category are required"
    }, { status: 400 })
  }

  // Validate amount
  const amount = Number(body.amount)
  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json({
      error: "Invalid amount",
      details: "Amount must be a positive number"
    }, { status: 400 })
  }

  // Validate type
  const validTypes = ['income', 'expense', 'transfer', 'investment']
  if (!validTypes.includes(body.type)) {
    return NextResponse.json({
      error: "Invalid type",
      details: `Type must be one of: ${validTypes.join(', ')}`
    }, { status: 400 })
  }

  try {
    // Enhanced finance entry with comprehensive field support
    const newFinance = {
      userId,
      transaction_id: body.transaction_id || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: body.type, // 'income' | 'expense' | 'transfer' | 'investment'
      amount: Number(body.amount),
      currency: body.currency || "INR",
      category: body.category,
      subcategory: body.subcategory || body.category, // Default to category if not provided
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
      location: body.location || null,
      notes: body.notes || null,

      // Investment fields
      investment_type: body.investment_type || null,
      units: body.units ? Number(body.units) : null,
      price_per_unit: body.price_per_unit ? Number(body.price_per_unit) : null,

      // Recurring fields
      recurring: body.recurring || false,
      recurring_frequency: body.recurring_frequency || null,

      // Audit Trail
      createdAt: new Date(),
      updatedAt: new Date(),
      created_by: body.created_by || "user"
    }

    const docRef = adminDb.collection("finances").doc()
    await docRef.set(newFinance)

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
    return NextResponse.json({ error: "Failed to create finance" }, { status: 500 })
  }
}
