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

// Initialize Firebase app only once
let app: FirebaseApp;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
} catch (error) {
  throw error
}

// Initialize Auth with error handling
let authInstance: Auth;
try {
  authInstance = getAuth(app)
} catch (error) {
  throw error
}

export { app }
export const auth = authInstance
export const googleProvider = new GoogleAuthProvider()
