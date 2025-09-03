"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { signInWithPopup } from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface AuthDialogProps {
  children?: React.ReactNode
  buttonText?: string
  buttonClassName?: string
  size?: "default" | "sm" | "lg" | "icon"
}

export function AuthDialog({ 
  children, 
  buttonText = "Get started", 
  buttonClassName = "bg-primary text-primary-foreground hover:opacity-90",
  size = "lg"
}: AuthDialogProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    try {
      console.log('🔑 Starting Google sign-in...')
      const result = await signInWithPopup(auth, googleProvider)
      console.log('✅ Google sign-in successful:', result.user.uid, result.user.email)
      
      // Wait a moment for auth state to propagate
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // User is signed in, redirect to onboarding
      router.push("/onboarding")
      setOpen(false)
    } catch (error: any) {
      console.error("❌ Auth error:", error)
      console.error("Error details:", {
        code: error?.code || 'Unknown code',
        message: error?.message || 'Unknown message',
        details: error
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} className={buttonClassName}>
          {children || buttonText}
        </Button>
      </DialogTrigger>
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
