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
      const result = await signInWithPopup(auth, googleProvider)
      
      // Get the user's ID token for API calls
      const idToken = await result.user.getIdToken()
      
      // Check if user has completed onboarding
      const profileResponse = await fetch("/api/profile", {
        headers: {
          "Authorization": `Bearer ${idToken}`,
        },
      })
      
      let onboardingComplete = false
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        onboardingComplete = profileData.profile?.onboarding_complete === true
      }
      
      // Wait a moment for auth state to propagate
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Redirect based on onboarding status
      if (onboardingComplete) {
        router.push("/dashboard")
      } else {
        router.push("/onboarding")
      }
      
      setOpen(false)
    } catch (error: any) {
      // Auth error
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
