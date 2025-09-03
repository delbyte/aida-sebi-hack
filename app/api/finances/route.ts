import { NextResponse } from "next/server"
import { loadUserData, saveUserData } from "@/lib/data-storage"

export async function GET() {
  const userId = "demo-user"
  const userData = await loadUserData(userId)
  return NextResponse.json({ finances: userData.finances })
}

export async function POST(req: Request) {
  const userId = "demo-user"
  const body = await req.json()
  const userData = await loadUserData(userId)
  const newEntry = {
    id: Date.now().toString(),
    date: body.date || new Date().toISOString().split('T')[0],
    type: body.type, // e.g., "income", "expense"
    category: body.category, // e.g., "salary", "food"
    amount: Number(body.amount),
    description: body.description || "",
    created_at: new Date().toISOString(),
  }
  userData.finances.push(newEntry)
  await saveUserData(userId, userData)
  return NextResponse.json({ entry: newEntry })
}
