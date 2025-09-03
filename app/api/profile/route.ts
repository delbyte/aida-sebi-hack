import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { headers } from "next/headers"

async function verifyFirebaseToken() {
  const headersList = headers()
  const authHeader = headersList.get("authorization")

  console.log('🔍 Auth Debug:', {
    hasAuthHeader: !!authHeader,
    authHeaderStartsWithBearer: authHeader?.startsWith("Bearer "),
    authHeaderLength: authHeader?.length,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
  })

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('❌ No valid authorization header')
    return null
  }

  const idToken = authHeader.substring(7) // Remove "Bearer " prefix

  try {
    console.log('🔐 Attempting to verify token...')
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    console.log('✅ Token verified successfully:', { uid: decodedToken.uid, email: decodedToken.email })
    return decodedToken.uid
  } catch (error) {
    console.error('❌ Token verification failed:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error && 'code' in error ? (error as any).code : 'Unknown code',
      name: error instanceof Error ? error.name : 'Unknown error type'
    })
    return null
  }
}

export async function GET(req: Request) {
  console.log('📥 GET /api/profile called')

  const userId = await verifyFirebaseToken()
  if (!userId) {
    console.log('❌ No valid user ID, returning 401')
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log('✅ User authenticated:', userId)

  try {
    const docRef = adminDb.collection("profiles").doc(userId)
    const docSnap = await docRef.get()
    const profile = docSnap.exists ? docSnap.data() : null
    console.log('📄 Profile data:', profile)
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('❌ Error fetching profile:', error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  console.log('📥 POST /api/profile called')

  const userId = await verifyFirebaseToken()
  if (!userId) {
    console.log('❌ No valid user ID for POST, returning 401')
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log('✅ User authenticated for POST:', userId)

  try {
    const body = await req.json()
    console.log('📄 Profile data to save:', body)

    const docRef = adminDb.collection("profiles").doc(userId)
    const payload = {
      full_name: body.full_name ?? null,
      goals: body.goals ?? null,
      risk_tolerance: body.risk_tolerance ?? null,
      monthly_income: body.monthly_income ? Number(body.monthly_income) : null,
      currency: body.currency ?? "INR",
      onboarding_complete: !!body.onboarding_complete,
      updatedAt: new Date(),
    }

    await docRef.set(payload, { merge: true })
    console.log('✅ Profile saved successfully')
    return NextResponse.json({ profile: payload })
  } catch (error) {
    console.error('❌ Error saving profile:', error)
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
  }
}

// Test endpoint to verify Firebase Admin SDK
export async function HEAD(req: Request) {
  try {
    console.log('🔧 Testing Firebase Admin SDK...')
    console.log('Admin Auth available:', !!adminAuth)
    console.log('Admin DB available:', !!adminDb)

    // Try to get a test document
    const testRef = adminDb.collection("test").doc("test-doc")
    await testRef.set({ test: true, timestamp: new Date() }, { merge: true })

    console.log('✅ Firebase Admin SDK test successful')
    return new Response(null, { status: 200 })
  } catch (error) {
    console.error('❌ Firebase Admin SDK test failed:', error)
    return new Response(null, { status: 500 })
  }
}
