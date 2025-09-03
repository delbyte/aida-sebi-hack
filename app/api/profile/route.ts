import { NextResponse } from "next/server"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firestore"
import * as admin from "firebase-admin"
import { headers } from "next/headers"

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

export async function GET(req: Request) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const docRef = doc(db, "profiles", userId)
  const docSnap = await getDoc(docRef)
  const profile = docSnap.exists() ? docSnap.data() : null
  return NextResponse.json({ profile })
}

export async function POST(req: Request) {
  const userId = await verifyFirebaseToken()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const docRef = doc(db, "profiles", userId)
  const payload = {
    full_name: body.full_name ?? null,
    goals: body.goals ?? null,
    risk_tolerance: body.risk_tolerance ?? null,
    monthly_income: body.monthly_income ? Number(body.monthly_income) : null,
    currency: body.currency ?? "INR",
    onboarding_complete: !!body.onboarding_complete,
    updatedAt: new Date(),
  }
  await setDoc(docRef, payload, { merge: true })
  return NextResponse.json({ profile: payload })
}
