"use client"

import * as React from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ProfileForm() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const { data, mutate } = useSWR(userId ? `/api/profile?userId=${userId}` : null, fetcher)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({
    full_name: "",
    goals: "",
    risk_tolerance: 5,
    monthly_income: "",
    currency: "INR",
  })

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null)
    })
    return unsubscribe
  }, [])

  React.useEffect(() => {
    if (data?.profile) {
      setForm({
        full_name: data.profile.full_name ?? "",
        goals: data.profile.goals ?? "",
        risk_tolerance: data.profile.risk_tolerance ?? 5,
        monthly_income: data.profile.monthly_income ?? "",
        currency: data.profile.currency ?? "INR",
      })
    }
  }, [data])

  async function save() {
    if (!userId) return
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId }),
      })
      if (res.ok) {
        await mutate()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="goals">Goals</Label>
          <Textarea id="goals" value={form.goals} onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="income">Monthly income</Label>
          <Input
            id="income"
            type="number"
            value={form.monthly_income}
            onChange={(e) => setForm((f) => ({ ...f, monthly_income: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          {["INR", "USD", "EUR"].map((c) => (
            <Button
              key={c}
              type="button"
              variant={form.currency === c ? "default" : "outline"}
              onClick={() => setForm((f) => ({ ...f, currency: c }))}
            >
              {c}
            </Button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
