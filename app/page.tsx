"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Shield, MessageCircle, ArrowRight, Sparkles } from "lucide-react"
import { siGithub } from "simple-icons"

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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-gradient-to-br from-indigo-400/15 to-purple-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-40 right-1/4 w-64 h-64 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <section className="relative mx-auto max-w-6xl px-6 py-24 flex flex-col items-center text-center gap-12">
        {/* Hero Badge */}
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-4 py-2 text-sm font-medium border border-blue-200/50 shadow-sm">
            Trusted, secure, and personal
          </span>
        </div>

        {/* Main Heading */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-balance text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
            A.I.D.A.
          </h1>
          <h2 className="text-balance text-2xl md:text-4xl font-semibold text-gray-700 mt-4">
            Your personal financial mentor
          </h2>
        </div>

        {/* Description */}
        <div className="animate-fade-in-up max-w-3xl" style={{ animationDelay: '0.4s' }}>
          <p className="text-pretty text-lg md:text-xl text-gray-600 leading-relaxed">
            Hyper-personalized, fiduciary-level advice powered by secure Account Aggregator consent and an empathetic AI that understands your financial journey.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <div className="flex gap-4 justify-center">
            <AuthDialog
              buttonClassName="group relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
              size="lg"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Get started
              </div>
            </AuthDialog>
            <Button
              asChild
              className="group relative bg-gray-800 hover:bg-gray-900 text-white rounded-full text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 px-8 py-4 h-[60px]"
              style={{ height: '40px' }}
              >
              <a
                href="https://github.com/delbyte/aida-sebi-hack"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d={siGithub.path} />
                </svg>
                View on GitHub
              </a>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
            <span>Free to start</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Features Grid */}
        <div id="how-it-works" className="grid md:grid-cols-3 gap-6 mt-16 w-full animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          <Card className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-left">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-800">Consent, not storage</h3>
              <p className="text-gray-600 leading-relaxed">
                A.I.D.A. uses RBI-regulated Account Aggregators. Your data is accessed temporarily with your explicit consent.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-left">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-800">Immediate insights</h3>
              <p className="text-gray-600 leading-relaxed">
                Within seconds, see actionable insights on debt, portfolio mix, and tax opportunities.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-left">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-800">Chat-first experience</h3>
              <p className="text-gray-600 leading-relaxed">
                Ask natural questions, get precise, compliant answers tailored to your finances.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute bottom-32 left-20 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-10 w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '2.5s' }}></div>
      </section>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </main>
  )
}
