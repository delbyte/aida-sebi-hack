"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, User } from "firebase/auth"

export function TypeformWizard() {
  const router = useRouter()
  const [step, setStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [user, setUser] = React.useState<User | null>(null)
  const [data, setData] = React.useState({
    full_name: "",
    goals: "",
    risk_tolerance: 5,
    monthly_income: "",
    currency: "INR",
  })

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('🔑 Auth state changed in onboarding:', currentUser?.uid, currentUser?.email)
      setUser(currentUser)
      if (!currentUser) {
        console.log('❌ No authenticated user, redirecting to home')
        router.push("/")
      }
    })
    return unsubscribe
  }, [router])

  function next() {
    setStep((s) => Math.min(s + 1, 4))
  }
  function prev() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function save() {
    if (!user) {
      console.error("❌ No authenticated user")
      return
    }

    setSaving(true)
    try {
      console.log('🔑 Getting ID token for onboarding save, user:', user.uid, user.email)
      const idToken = await user.getIdToken()
      console.log('✅ Got ID token for onboarding, length:', idToken.length)

      console.log('📤 Making POST request to /api/profile from onboarding')
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ ...data, onboarding_complete: true }),
      })

      console.log('📡 Onboarding POST Response status:', res.status)
      if (res.ok) {
        const responseData = await res.json()
        console.log('✅ Onboarding save successful')
        // Save to localStorage
        localStorage.setItem("profile", JSON.stringify(responseData.profile))
        router.push("/chat")
      } else {
        const errorText = await res.text()
        console.error('❌ Onboarding save failed:', res.status, errorText)
      }
    } catch (error) {
      console.error('❌ Error saving onboarding:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow p-6 md:p-8">
      <div className="mb-4 text-sm text-muted-foreground">Step {step + 1} of 5</div>

      {step === 0 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">Welcome! What should we call you?</h2>
          <Input
            placeholder="Your name"
            value={data.full_name}
            onChange={(e) => setData((d) => ({ ...d, full_name: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button onClick={next} disabled={!data.full_name}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">What are your top financial goals?</h2>
          <Textarea
            placeholder="e.g., pay off loan, build emergency fund, invest for retirement"
            value={data.goals}
            onChange={(e) => setData((d) => ({ ...d, goals: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={prev}>
              Back
            </Button>
            <Button onClick={next} disabled={!data.goals.trim()}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">How much risk are you comfortable with?</h2>
          <p className="text-sm text-muted-foreground">0 = very low, 10 = very high</p>
          <Slider
            value={[data.risk_tolerance]}
            min={0}
            max={10}
            step={1}
            onValueChange={(v) => setData((d) => ({ ...d, risk_tolerance: v[0] ?? 5 }))}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={prev}>
              Back
            </Button>
            <Button onClick={next}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">What’s your monthly income?</h2>
          <Input
            type="number"
            placeholder="e.g., 100000"
            value={data.monthly_income}
            onChange={(e) => setData((d) => ({ ...d, monthly_income: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={prev}>
              Back
            </Button>
            <Button onClick={next} disabled={!data.monthly_income}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">Choose your currency</h2>
          <div className="flex gap-2">
            {["INR", "USD", "EUR"].map((c) => (
              <Button
                key={c}
                type="button"
                variant={data.currency === c ? "default" : "outline"}
                onClick={() => setData((d) => ({ ...d, currency: c }))}
              >
                {c}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={prev}>
              Back
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Finish"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
