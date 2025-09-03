import { NextResponse } from "next/server"
import { createServer } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data ?? null })
}

export async function POST(req: Request) {
  const supabase = createServer()
  const body = await req.json()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const payload = {
    user_id: user.id,
    full_name: body.full_name ?? null,
    goals: body.goals ?? null,
    risk_tolerance: body.risk_tolerance ?? null,
    monthly_income: body.monthly_income ? Number(body.monthly_income) : null,
    currency: body.currency ?? "INR",
    onboarding_complete: !!body.onboarding_complete,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
