// lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Debug: Check environment variables
console.log('🔍 Firebase Environment Check:', {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Present' : '❌ Missing',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Present' : '❌ Missing',
  apiKeyFormat: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.startsWith('AIzaSy') ? '✅ Valid format' : '❌ Invalid format',
  apiKeyLength: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.length,
})

// Initialize Firebase app only once
let app: FirebaseApp;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  console.log('✅ Firebase app initialized successfully')
} catch (error) {
  console.error('❌ Firebase app initialization failed:', error)
  throw error
}

// Initialize Auth with error handling
let authInstance: Auth;
try {
  authInstance = getAuth(app)
  console.log('✅ Firebase Auth initialized successfully')
} catch (error) {
  console.error('❌ Firebase Auth initialization failed:', error)
  console.error('This might be due to:')
  console.error('1. Invalid API key')
  console.error('2. Firebase project not having Authentication enabled')
  console.error('3. Domain restrictions on the API key')
  console.error('4. API key from wrong Firebase project')
  throw error
}

export { app }
export const auth = authInstance
export const googleProvider = new GoogleAuthProvider()
