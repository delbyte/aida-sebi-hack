"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signOut, User } from "firebase/auth"

export default function AuthTestPage() {
  const [user, setUser] = React.useState<User | null>(null)
  const [tokenInfo, setTokenInfo] = React.useState<any>(null)
  const [testResults, setTestResults] = React.useState<any>({})

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken()
          const claims = await currentUser.getIdTokenResult()
          setTokenInfo({
            token: token.substring(0, 50) + "...",
            length: token.length,
            claims: claims.claims,
            authTime: claims.authTime,
            issuedAtTime: claims.issuedAtTime,
            expirationTime: claims.expirationTime,
          })
        } catch (error) {
          console.error("Error getting token:", error)
        }
      } else {
        setTokenInfo(null)
      }
    })
    return unsubscribe
  }, [])

  const testAPI = async (endpoint: string, method = "GET") => {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/${endpoint}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: method === "POST" ? JSON.stringify({ test: true }) : undefined,
      })
      
      const result = {
        status: response.status,
        ok: response.ok,
        data: await response.text(),
      }
      
      setTestResults((prev: any) => ({ ...prev, [endpoint]: result }))
    } catch (error) {
      setTestResults((prev: any) => ({ ...prev, [endpoint]: { error: error instanceof Error ? error.message : 'Unknown error' } }))
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Firebase Auth Test Page</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-2">
              <p><strong>User ID:</strong> {user.uid}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Display Name:</strong> {user.displayName}</p>
              <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
            </div>
          ) : (
            <p>Not authenticated. Go to <a href="/" className="underline">home page</a> to sign in.</p>
          )}
        </CardContent>
      </Card>

      {tokenInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Token Preview:</strong> {tokenInfo.token}</p>
              <p><strong>Token Length:</strong> {tokenInfo.length}</p>
              <p><strong>Auth Time:</strong> {tokenInfo.authTime}</p>
              <p><strong>Issued At:</strong> {tokenInfo.issuedAtTime}</p>
              <p><strong>Expires At:</strong> {tokenInfo.expirationTime}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => testAPI("profile")} disabled={!user}>
                Test GET /api/profile
              </Button>
              <Button onClick={() => testAPI("profile", "POST")} disabled={!user}>
                Test POST /api/profile
              </Button>
              <Button onClick={() => testAPI("finances")} disabled={!user}>
                Test GET /api/finances
              </Button>
            </div>
            
            <div className="space-y-2">
              {Object.entries(testResults).map(([endpoint, result]) => (
                <div key={endpoint} className="p-3 border rounded">
                  <p><strong>/api/{endpoint}:</strong></p>
                  <pre className="text-xs mt-1 overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
