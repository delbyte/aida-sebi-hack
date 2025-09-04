"use client"

import * as React from "react"
import { Navigation } from "@/components/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  requireAuth?: boolean
  maxWidth?: string
  padding?: string
}

export function PageLayout({
  children,
  title,
  description,
  requireAuth = true,
  maxWidth = "max-w-7xl",
  padding = "px-4 sm:px-6 lg:px-8 py-8",
}: PageLayoutProps) {
  const [user, loading] = useAuthState(auth)
  const router = useRouter()

  React.useEffect(() => {
    if (!loading && requireAuth && !user) {
      router.push("/")
    }
  }, [user, loading, requireAuth, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className={`mx-auto ${maxWidth} ${padding}`}>
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (requireAuth && !user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className={`mx-auto ${maxWidth} ${padding}`}>
        {(title || description) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-2 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
