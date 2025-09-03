"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { signInWithPopup } from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"
import { useRouter } from "next/navigation"

export function AuthDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      // User is signed in, redirect to onboarding
      router.push("/onboarding")
      setOpen(false)
    } catch (error) {
      console.error("Auth error:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Sign in to A.I.D.A.</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button onClick={handleGoogleSignIn} className="w-full">
            Sign in with Google
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
