import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { messages = [], profile: clientProfile } = body

  // Use client-provided profile or mock
  const profile = clientProfile || {
    full_name: "Demo User",
    goals: "Learn about investing",
    risk_tolerance: "moderate",
    monthly_income: 50000,
    currency: "INR",
  }

  const system = [
    "You are A.I.D.A., an empathetic, SEBI-compliant financial mentor.",
    "Only use the provided user profile and message history for advice.",
    "Avoid speculative or non-factual statements. Be clear, calm, and practical.",
    `User profile: ${JSON.stringify(profile)}`,
  ].join("\n")

  const prompt = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system,
    prompt,
  })

  return NextResponse.json({ reply: text })
}
