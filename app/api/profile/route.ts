import { NextResponse } from "next/server"
import { loadUserData, saveUserData } from "@/lib/data-storage"

export async function GET() {
  // For demo, use a fixed userId
  const userId = "demo-user"
  const userData = await loadUserData(userId)
  return NextResponse.json({ profile: userData.profile })
}

export async function POST(req: Request) {
  const userId = "demo-user"
  const body = await req.json()
  const userData = await loadUserData(userId)
  userData.profile = {
    user_id: userId,
    full_name: body.full_name ?? userData.profile?.full_name ?? "Demo User",
    goals: body.goals ?? userData.profile?.goals ?? "Learn about investing",
    risk_tolerance: body.risk_tolerance ?? userData.profile?.risk_tolerance ?? "moderate",
    monthly_income: body.monthly_income ? Number(body.monthly_income) : userData.profile?.monthly_income ?? 50000,
    currency: body.currency ?? userData.profile?.currency ?? "INR",
    onboarding_complete: !!body.onboarding_complete,
    updated_at: new Date().toISOString(),
  }
  await saveUserData(userId, userData)
  return NextResponse.json({ profile: userData.profile })
}
