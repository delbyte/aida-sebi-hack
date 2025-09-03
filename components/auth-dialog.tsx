"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

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
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState<"idle" | "email" | "google">("idle")
  const [error, setError] = React.useState<string | null>(null)

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading("email")
    try {
      // Mock sign-in for tech demo
      if (email && password) {
        localStorage.setItem("user", JSON.stringify({ email, name: email.split("@")[0] }))
        onSuccess?.()
        router.push("/onboarding")
      } else {
        setError("Please enter email and password")
      }
    } finally {
      setLoading("idle")
    }
  }

  async function handleGoogle() {
    setError(null)
    setLoading("google")
    try {
      // Mock Google sign-in
      localStorage.setItem("user", JSON.stringify({ email: "demo@gmail.com", name: "Demo User" }))
      onSuccess?.()
      router.push("/onboarding")
    } finally {
      setLoading("idle")
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading("email")
    try {
      // Mock sign-up
      if (email && password) {
        localStorage.setItem("user", JSON.stringify({ email, name: email.split("@")[0] }))
        onSuccess?.()
        router.push("/onboarding")
      } else {
        setError("Please enter email and password")
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
