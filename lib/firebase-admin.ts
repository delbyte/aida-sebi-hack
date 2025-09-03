// lib/firebase-admin.ts
import * as admin from "firebase-admin"

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  console.log('🔧 Initializing Firebase Admin SDK...')
  console.log('Admin SDK Config:', {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? '✅ Present' : '❌ Missing',
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? '✅ Present' : '❌ Missing',
  })

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
    console.log('✅ Firebase Admin SDK initialized successfully')
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error)
    throw error
  }
} else {
  console.log('ℹ️ Firebase Admin SDK already initialized')
}

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()
