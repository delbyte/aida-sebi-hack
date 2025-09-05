// lib/firestore.ts
import { getFirestore, Firestore } from "firebase/firestore"
import { app } from "./firebase"

// Initialize Firestore with error handling
let db: Firestore

try {
  db = getFirestore(app)
} catch (error) {
  throw error
}

export { db }
