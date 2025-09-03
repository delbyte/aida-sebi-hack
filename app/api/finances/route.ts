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
    const financesRef = adminDb.collection("finances")
    const querySnapshot = await financesRef.where("userId", "==", userId).get()
    const finances = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

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
    const newFinance = {
      userId,
      type: body.type,
      amount: Number(body.amount),
      category: body.category,
      description: body.description,
      date: body.date ? new Date(body.date) : new Date(),
      createdAt: new Date(),
    }

    const docRef = adminDb.collection("finances").doc()
    await docRef.set(newFinance)

    return NextResponse.json({ finance: { id: docRef.id, ...newFinance } })
  } catch (error) {
    console.error("Error creating finance:", error)
    return NextResponse.json({ error: "Failed to create finance" }, { status: 500 })
  }
}
