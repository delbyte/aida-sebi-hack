"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/browser"

export function AuthDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Sign in to A.I.D.A.</DialogTitle>
        </DialogHeader>
        <AuthForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function AuthForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState<"idle" | "email" | "google">("idle")
  const [error, setError] = React.useState<string | null>(null)

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading("email")
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        onSuccess?.()
        // If new user without profile, redirect to onboarding; else chat
        router.push("/onboarding")
      }
    } finally {
      setLoading("idle")
    }
  }

  async function handleGoogle() {
    setError(null)
    setLoading("google")
    try {
      const redirectTo = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/onboarding`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      })
      if (error) setError(error.message)
    } finally {
      setLoading("idle")
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading("email")
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/onboarding`,
        },
      })
      if (error) {
        setError(error.message)
      } else {
        onSuccess?.()
      }
    } finally {
      setLoading("idle")
    }
  }

  return (
    <div className="space-y-4">
      <form className="space-y-3" onSubmit={handleEmailSignIn}>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={loading !== "idle"} className="bg-primary text-primary-foreground">
            {loading === "email" ? "Signing in..." : "Sign in"}
          </Button>
          <Button type="button" variant="secondary" disabled={loading !== "idle"} onClick={handleSignUp}>
            {loading === "email" ? "Creating..." : "Create account"}
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <Button variant="outline" disabled={loading !== "idle"} onClick={handleGoogle} className="w-full bg-transparent">
        {loading === "google" ? "Redirecting..." : "Google"}
      </Button>
    </div>
  )
}
