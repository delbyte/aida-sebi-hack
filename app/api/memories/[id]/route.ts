import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { headers } from "next/headers"
import { updateMemory } from "@/lib/ai-memory-manager"

async function verifyFirebaseToken() {
  const headersList = headers()
  const authHeader = headersList.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const idToken = authHeader.substring(7)

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    return decodedToken.uid
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await verifyFirebaseToken()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const memoryId = params.id
    const body = await req.json()
    const { content, category, importance_score } = body

    const success = await updateMemory(userId, memoryId, {
      content,
      categories: category ? [category] : undefined,
      importance_score
    })

    if (!success) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Memory updated successfully"
    })
  } catch (error) {
    console.error('Error updating memory:', error)
    return NextResponse.json(
      { error: "Failed to update memory" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await verifyFirebaseToken()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const memoryId = params.id

    // Delete memory from Firestore
    const memoryRef = adminDb.collection("memories").doc(memoryId)
    const memorySnap = await memoryRef.get()

    if (!memorySnap.exists) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 })
    }

    const memoryData = memorySnap.data()
    if (memoryData?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await memoryRef.delete()

    return NextResponse.json({
      message: "Memory deleted successfully"
    })
  } catch (error) {
    console.error('Error deleting memory:', error)
    return NextResponse.json(
      { error: "Failed to delete memory" },
      { status: 500 }
    )
  }
}
