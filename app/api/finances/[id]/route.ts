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

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const financeId = params.id
    const financeRef = adminDb.collection("finances").doc(financeId)
    const financeSnap = await financeRef.get()

    if (!financeSnap.exists) {
      return NextResponse.json({ error: "Finance not found" }, { status: 404 })
    }

    const finance = financeSnap.data()

    // Verify ownership
    if (finance?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      finance: {
        id: financeSnap.id,
        ...finance,
        date: finance.date?.toDate?.()?.toISOString() || finance.date,
        createdAt: finance.createdAt?.toDate?.()?.toISOString() || finance.createdAt,
        updatedAt: finance.updatedAt?.toDate?.()?.toISOString() || finance.updatedAt
      }
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch finance" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  try {
    const financeId = params.id
    const financeRef = adminDb.collection("finances").doc(financeId)
    const financeSnap = await financeRef.get()

    if (!financeSnap.exists) {
      return NextResponse.json({ error: "Finance not found" }, { status: 404 })
    }

    const existingFinance = financeSnap.data()

    // Verify ownership
    if (existingFinance?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Validate required fields for update
    if (body.type && !['income', 'expense', 'transfer', 'investment'].includes(body.type)) {
      return NextResponse.json({
        error: "Invalid type",
        details: `Type must be one of: income, expense, transfer, investment`
      }, { status: 400 })
    }

    if (body.amount !== undefined) {
      const amount = Number(body.amount)
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({
          error: "Invalid amount",
          details: "Amount must be a positive number"
        }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    }

    // Only include fields that are provided
    const allowedFields = [
      'type', 'amount', 'currency', 'category', 'subcategory', 'description',
      'merchant', 'date', 'payment_method', 'tags', 'location', 'notes',
      'investment_type', 'units', 'price_per_unit', 'current_value',
      'recurring', 'recurring_frequency'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'date') {
          updateData[field] = new Date(body[field])
        } else if (field === 'amount' || field === 'units' || field === 'price_per_unit' || field === 'current_value') {
          updateData[field] = Number(body[field])
        } else {
          updateData[field] = body[field]
        }
      }
    }

    // Update the document
    await financeRef.update(updateData)

    // Fetch updated document
    const updatedSnap = await financeRef.get()
    const updatedFinance = updatedSnap.data()

    return NextResponse.json({
      finance: {
        id: updatedSnap.id,
        ...updatedFinance,
        date: updatedFinance?.date?.toDate?.()?.toISOString() || updatedFinance?.date,
        createdAt: updatedFinance?.createdAt?.toDate?.()?.toISOString() || updatedFinance?.createdAt,
        updatedAt: updatedFinance?.updatedAt?.toDate?.()?.toISOString() || updatedFinance?.updatedAt
      }
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update finance" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const financeId = params.id
    const financeRef = adminDb.collection("finances").doc(financeId)
    const financeSnap = await financeRef.get()

    if (!financeSnap.exists) {
      return NextResponse.json({ error: "Finance not found" }, { status: 404 })
    }

    const finance = financeSnap.data()

    // Verify ownership
    if (finance?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete the document
    await financeRef.delete()

    return NextResponse.json({ message: "Finance deleted successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete finance" }, { status: 500 })
  }
}
