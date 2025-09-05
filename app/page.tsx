"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, TrendingUp, Shield, MessageCircle, ArrowRight, Github } from "lucide-react"

// Lazy load the auth dialog
const AuthDialog = dynamic(() => import("@/components/auth-dialog").then(mod => ({ default: mod.AuthDialog })), { ssr: false })

// Lazy load dynamic import
import dynamic from "next/dynamic"

export default function LandingPage() {
  const [user, loading] = useAuthState(auth)
  const [checkingProfile, setCheckingProfile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user || loading) return

      // Skip profile check if we already checked recently (simple caching)
      const lastCheck = localStorage.getItem('profileCheck')
      if (lastCheck && Date.now() - parseInt(lastCheck) < 30000) { // 30 seconds
        return
      }

      setCheckingProfile(true)
      try {
        const idToken = await user.getIdToken()

        const response = await fetch("/api/profile", {
          headers: {
            "Authorization": `Bearer ${idToken}`,
          },
        })

        localStorage.setItem('profileCheck', Date.now().toString())

        if (response.ok) {
          const { profile } = await response.json()

          if (profile && profile.onboarding_complete) {
            router.push("/dashboard")
            return
          }

          if (profile) {
            router.push("/onboarding")
            return
          }
        }

        router.push("/onboarding")
      } catch (error) {
        router.push("/onboarding")
      } finally {
        setCheckingProfile(false)
      }
    }

    if (!loading && user) {
      checkUserProfile()
    }
  }, [user, loading, router])

  // Show loading state while checking authentication or profile
  if (loading || checkingProfile) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      </main>
    )
  }

  // If user is authenticated, they should have been redirected above
  // If we reach here, user is not authenticated, show landing page
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Simplified background */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-indigo-200 rounded-full blur-3xl"></div>
      </div>

      <section className="relative mx-auto max-w-6xl px-6 py-24 flex flex-col items-center text-center gap-12">
        {/* Hero Badge */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 text-blue-700 px-4 py-2 text-sm font-medium">
            Trusted, secure, and personal
          </span>
        </div>

        {/* Main Heading */}
        <div>
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            A.I.D.A.
          </h1>
          <h2 className="text-2xl md:text-4xl font-semibold text-gray-700 mt-4">
            Your personal financial mentor
          </h2>
        </div>

        {/* Description */}
        <div className="max-w-3xl">
          <p className="text-lg md:text-xl text-gray-600">
            Hyper-personalized, fiduciary-level advice powered by secure Account Aggregator consent.
          </p>
        </div>

        {/* CTA Buttons */}
        <div>
          <div className="flex gap-4 justify-center flex-wrap">
            <Suspense fallback={<Skeleton className="h-12 w-32" />}>
              <AuthDialog
                buttonText="Get started"
                buttonClassName="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-full text-lg font-semibold"
                size="lg"
              />
            </Suspense>
            <Button
              asChild
              className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-4 rounded-full text-lg font-semibold flex items-center gap-2"
            >
              <a
                href="https://github.com/delbyte/aida-sebi-hack"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-5 h-5" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-16 w-full">
          <Card className="border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-left">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-800">Consent, not storage</h3>
              <p className="text-gray-600">
                A.I.D.A. uses RBI-regulated Account Aggregators. Your data is accessed temporarily with your explicit consent.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-left">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-800">Immediate insights</h3>
              <p className="text-gray-600">
                Within seconds, see actionable insights on debt, portfolio mix, and tax opportunities.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-left">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-800">Chat-first experience</h3>
              <p className="text-gray-600">
                Ask natural questions, get precise, compliant answers tailored to your finances.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
