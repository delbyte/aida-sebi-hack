// lib/firestore.ts
import { getFirestore, Firestore } from "firebase/firestore"
import { app } from "./firebase"

// Initialize Firestore with error handling
let db: Firestore

try {
  db = getFirestore(app)
  console.log('✅ Firestore initialized successfully')
} catch (error) {
  console.error('❌ Firestore initialization failed:', error)
  throw error
}

export { db }
