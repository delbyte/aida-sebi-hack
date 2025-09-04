import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { headers } from "next/headers"
import { createMemory, updateMemory, getUserMemories, buildMemoryContext } from "@/lib/ai-memory-manager"

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
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const topic = searchParams.get('topic')

    let memories = await getUserMemories(userId)

    // Filter by category if specified
    if (category) {
      memories = memories.filter(memory => memory.categories.includes(category))
    }

    // Filter by topic relevance if specified
    if (topic) {
      const relevantMemories = []
      for (const memory of memories) {
        const relevanceScore = calculateRelevanceScore(memory, topic)
        if (relevanceScore > 0.3) {
          relevantMemories.push({ ...memory, relevanceScore })
        }
      }
      memories = relevantMemories
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .map(({ relevanceScore, ...memory }) => memory)
    }

    // Apply limit
    memories = memories.slice(0, limit)

    // Convert dates for JSON serialization
    const serializedMemories = memories.map(memory => ({
      ...memory,
      last_accessed: memory.last_accessed.toISOString(),
      createdAt: memory.createdAt.toISOString(),
      updatedAt: memory.updatedAt.toISOString(),
      valid_from: memory.valid_from?.toISOString(),
      valid_until: memory.valid_until?.toISOString(),
    }))

    return NextResponse.json({ memories: serializedMemories })
  } catch (error) {
    console.error("Error fetching memories:", error)
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  try {
    const { content, category, importance, source_type, source_message } = body

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const memoryId = await createMemory(userId, content, {
      category,
      importance: importance || 5,
      source_type: source_type || 'user_input',
      source_message
    })

    // Fetch the created memory to return it
    const memoryRef = adminDb.collection("memories").doc(memoryId)
    const memorySnap = await memoryRef.get()
    
    if (memorySnap.exists) {
      const memoryData = memorySnap.data()
      return NextResponse.json({
        message: "Memory created successfully",
        memory: {
          id: memoryId,
          ...memoryData,
          createdAt: memoryData?.createdAt?.toISOString(),
          updatedAt: memoryData?.updatedAt?.toISOString(),
          last_accessed: memoryData?.last_accessed?.toISOString()
        }
      })
    } else {
      return NextResponse.json({
        memoryId,
        message: "Memory created successfully"
      })
    }
  } catch (error) {
    console.error("Error creating memory:", error)
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  try {
    const { memoryId, content, category, importance } = body

    if (!memoryId) {
      return NextResponse.json({ error: "Memory ID is required" }, { status: 400 })
    }

    const success = await updateMemory(userId, memoryId, {
      content,
      categories: category ? [category] : undefined,
      importance_score: importance
    })

    if (!success) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Memory updated successfully"
    })
  } catch (error) {
    console.error("Error updating memory:", error)
    return NextResponse.json({ error: "Failed to update memory" }, { status: 500 })
  }
}

// Helper function for relevance scoring
function calculateRelevanceScore(memory: any, topic: string): number {
  let score = 0
  const lowerTopic = topic.toLowerCase()

  // Category relevance
  if (memory.categories.some((cat: string) => lowerTopic.includes(cat) || cat.includes(lowerTopic.split(' ')[0]))) {
    score += 0.4
  }

  // Keyword relevance
  const keywordMatches = memory.keywords.filter((keyword: string) => lowerTopic.includes(keyword)).length
  score += keywordMatches * 0.1

  // Theme relevance
  if (memory.themes.some((theme: string) => lowerTopic.includes(theme))) {
    score += 0.3
  }

  // Recency bonus
  const daysSinceAccess = (Date.now() - new Date(memory.last_accessed).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceAccess < 7) score += 0.2
  else if (daysSinceAccess < 30) score += 0.1

  // Importance bonus
  score += (memory.importance_score / 10) * 0.2

  return Math.min(1, score)
}
