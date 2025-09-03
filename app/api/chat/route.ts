import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firestore"
import * as admin from "firebase-admin"
import { headers } from "next/headers"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  })
}

const adminAuth = admin.auth()

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

export async function POST(req: Request) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { messages = [], profile: clientProfile } = body

  const profile = clientProfile || {
    full_name: "Demo User",
    goals: "Learn about investing",
    risk_tolerance: "moderate",
    monthly_income: 50000,
    currency: "INR",
  }

  // Fetch memory from Firestore
  const memoryDocRef = doc(db, "memories", userId)
  const memoryDoc = await getDoc(memoryDocRef)
  const memory = memoryDoc.exists() ? memoryDoc.data()?.content || "No prior memory available." : "No prior memory available."

  const system = [
    "You are A.I.D.A., an empathetic, SEBI-compliant financial mentor.",
    "Always reference and update the user's memory before responding.",
    "If you need to update memory, output 'UPDATE_MEMORY: [new data]' at the end of your response.",
    `User profile: ${JSON.stringify(profile)}`,
    `User memory: ${memory}`,
  ].join("\n")

  const prompt = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")

  const result = await model.generateContent(`${system}\n${prompt}`)
  const reply = result.response.text()

  // Parse for memory update
  const updateMatch = reply.match(/UPDATE_MEMORY:\s*(.+)/)
  const updatedMemory = updateMatch ? updateMatch[1] : memory

  // Save updated memory to Firestore
  if (updateMatch) {
    await setDoc(memoryDocRef, { content: updatedMemory, updatedAt: new Date() }, { merge: true })
  }

  return NextResponse.json({ reply: reply.replace(/UPDATE_MEMORY:.*/, "").trim(), updatedMemory })
}
