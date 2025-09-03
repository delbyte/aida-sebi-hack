import { NextResponse } from "next/server"
import { createServer } from "@/lib/supabase/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: Request) {
  const supabase = createServer()
  const body = await req.json().catch(() => ({}))
  const { messages = [] } = body

  // Load user + profile for personalized context
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let profile: any = null
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle()
    profile = data
  }

  const system = [
    "You are A.I.D.A., an empathetic, SEBI-compliant financial mentor.",
    "Only use the provided user profile and message history for advice.",
    "Avoid speculative or non-factual statements. Be clear, calm, and practical.",
    profile
      ? `User profile: ${JSON.stringify({
          full_name: profile.full_name,
          goals: profile.goals,
          risk_tolerance: profile.risk_tolerance,
          monthly_income: profile.monthly_income,
          currency: profile.currency,
        })}`
      : "No profile yet.",
  ].join("\n")

  const prompt = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system,
    prompt,
  })

  return NextResponse.json({ reply: text })
}
