"use client"

import * as React from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

const fetcher = async (url: string) => {
  const user = auth.currentUser
  if (!user) {
    console.log('❌ No authenticated user for API call')
    throw new Error("No authenticated user")
  }

  console.log('🔑 Getting ID token for user:', user.uid, user.email)
  const idToken = await user.getIdToken()
  console.log('✅ Got ID token, length:', idToken.length)

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${idToken}`,
    },
  })

  console.log('📡 API Response status:', response.status)
  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ API Error:', response.status, errorText)
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export default function Dashboard() {
  const [userId, setUserId] = React.useState<string | null>(null)
  const { data, mutate } = useSWR(userId ? `/api/finances?userId=${userId}` : null, fetcher)
  const [newEntry, setNewEntry] = React.useState({
    type: "",
    amount: "",
    category: "",
    description: "",
  })

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null)
    })
    return unsubscribe
  }, [])

  const finances = data?.finances || []

  // Group by date for chart
  const chartData = React.useMemo(() => {
    const grouped = finances.reduce((acc: any, item: any) => {
      const date = item.date.split('T')[0]
      if (!acc[date]) acc[date] = { date, income: 0, expenses: 0 }
      if (item.type === 'income') acc[date].income += item.amount
      else acc[date].expenses += item.amount
      return acc
    }, {})
    return Object.values(grouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [finances])

  async function addEntry() {
    if (!newEntry.type || !newEntry.amount || !userId) return

    try {
      const user = auth.currentUser
      if (!user) {
        console.error("❌ No authenticated user")
        return
      }

      console.log('🔑 Getting ID token for POST request, user:', user.uid, user.email)
      const idToken = await user.getIdToken()
      console.log('✅ Got ID token for POST, length:', idToken.length)

      console.log('📤 Making POST request to /api/finances')
      const response = await fetch("/api/finances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify(newEntry),
      })

      console.log('📡 POST Response status:', response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ POST Error:', response.status, errorText)
      } else {
        console.log('✅ POST Success')
        mutate()
        setNewEntry({ type: "", amount: "", category: "", description: "" })
      }
    } catch (error) {
      console.error("❌ Error adding transaction:", error)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Finance Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="income" fill="#8884d8" />
              <Bar dataKey="expenses" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Transaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={newEntry.type} onValueChange={(value) => setNewEntry((e) => ({ ...e, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={newEntry.amount}
                onChange={(e) => setNewEntry((entry) => ({ ...entry, amount: e.target.value }))}
                placeholder="e.g., 5000"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={newEntry.category}
                onChange={(e) => setNewEntry((entry) => ({ ...entry, category: e.target.value }))}
                placeholder="e.g., Salary, Food"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newEntry.description}
                onChange={(e) => setNewEntry((entry) => ({ ...entry, description: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <Button onClick={addEntry}>Add Transaction</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {finances.slice(0, 10).map((item: any) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.date.split('T')[0]} - {item.category}: {item.description}</span>
                <span className={item.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                  {item.type === 'income' ? '+' : '-'}{item.amount}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
