"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AuthDialog } from "@/components/auth-dialog"
import { Skeleton } from "@/components/ui/skeleton"

export default function LandingPage() {
  const [user, loading] = useAuthState(auth)
  const [checkingProfile, setCheckingProfile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user || loading) return

      setCheckingProfile(true)
      try {
        // Get user's ID token for API authentication
        const idToken = await user.getIdToken()

        // Fetch user profile to check onboarding status
        const response = await fetch("/api/profile", {
          headers: {
            "Authorization": `Bearer ${idToken}`,
          },
        })

        if (response.ok) {
          const { profile } = await response.json()

          // If profile exists and onboarding is complete, redirect to dashboard
          if (profile && profile.onboarding_complete) {
            router.push("/dashboard")
            return
          }

          // If profile exists but onboarding not complete, redirect to onboarding
          if (profile) {
            router.push("/onboarding")
            return
          }
        }

        // If no profile found or error, user needs to complete onboarding
        router.push("/onboarding")
      } catch (error) {
        console.error("Error checking profile:", error)
        // On error, still redirect to onboarding to be safe
        router.push("/onboarding")
      } finally {
        setCheckingProfile(false)
      }
    }

    // Only check profile if user is authenticated and not loading
    if (!loading && user) {
      checkUserProfile()
    }
  }, [user, loading, router])

  // Show loading state while checking authentication or profile
  if (loading || checkingProfile) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </main>
    )
  }

  // If user is authenticated, they should have been redirected above
  // If we reach here, user is not authenticated, show landing page
  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-5xl px-6 py-24 flex flex-col items-center text-center gap-8">
        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs">
          Trusted, secure, and personal
        </span>
        <h1 className="text-balance text-4xl md:text-6xl font-bold text-foreground">
          A.I.D.A. — Your personal financial mentor
        </h1>
        <p className="max-w-2xl text-pretty text-base md:text-lg text-muted-foreground">
          Hyper-personalized, fiduciary-level advice powered by secure Account Aggregator consent and an empathetic AI.
        </p>
        <div className="flex items-center gap-3">
          <AuthDialog
            buttonText="Get started"
            buttonClassName="bg-primary text-primary-foreground hover:opacity-90"
            size="lg"
          />
        </div>

        <div id="how-it-works" className="grid md:grid-cols-3 gap-4 mt-12 w-full">
          <Card>
            <CardContent className="p-6 text-left">
              <h3 className="font-semibold mb-2">Consent, not storage</h3>
              <p className="text-sm text-muted-foreground">
                A.I.D.A. uses RBI-regulated Account Aggregators. Your data is accessed temporarily with your explicit
                consent.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-left">
              <h3 className="font-semibold mb-2">Immediate insights</h3>
              <p className="text-sm text-muted-foreground">
                Within seconds, see actionable insights on debt, portfolio mix, and tax opportunities.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-left">
              <h3 className="font-semibold mb-2">Chat-first experience</h3>
              <p className="text-sm text-muted-foreground">
                Ask natural questions, get precise, compliant answers tailored to your finances.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
