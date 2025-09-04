"use client"

import * as React from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { TrendingUp, TrendingDown, DollarSign, CreditCard, PiggyBank, AlertCircle, Plus, RefreshCw } from "lucide-react"
import { PageLayout } from "@/components/page-layout"

const fetcher = async (url: string) => {
  const user = auth.currentUser
  if (!user) {
    throw new Error("No authenticated user")
  }

  const idToken = await user.getIdToken()
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${idToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export default function Dashboard() {
  const { data, error, mutate, isLoading } = useSWR('/api/finances', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true
  })

  const [newEntry, setNewEntry] = React.useState({
    type: "",
    amount: "",
    category: "",
    description: "",
    currency: "INR",
    payment_method: "",
  })

  const [user, setUser] = React.useState<any>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return unsubscribe
  }, [])

  const finances = data?.finances || []

  // Calculate summary statistics
  const summary = React.useMemo(() => {
    const totalIncome = finances
      .filter((f: any) => f.type === 'income')
      .reduce((sum: number, f: any) => sum + (f.amount || 0), 0)

    const totalExpenses = finances
      .filter((f: any) => f.type === 'expense')
      .reduce((sum: number, f: any) => sum + (f.amount || 0), 0)

    const netSavings = totalIncome - totalExpenses

    const aiGeneratedCount = finances.filter((f: any) => f.ai_generated).length

    return { totalIncome, totalExpenses, netSavings, aiGeneratedCount }
  }, [finances])

  // Group data for charts
  const chartData = React.useMemo(() => {
    const grouped = finances.reduce((acc: any, item: any) => {
      const date = item.date?.split('T')[0]
      if (!date) return acc

      if (!acc[date]) acc[date] = { date, income: 0, expenses: 0 }
      if (item.type === 'income') acc[date].income += item.amount || 0
      else if (item.type === 'expense') acc[date].expenses += item.amount || 0
      return acc
    }, {})

    return Object.values(grouped)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14) // Last 14 days
  }, [finances])

  // Category breakdown for pie chart
  const categoryData = React.useMemo(() => {
    const categories = finances
      .filter((f: any) => f.type === 'expense')
      .reduce((acc: any, item: any) => {
        const category = item.category || 'Other'
        acc[category] = (acc[category] || 0) + (item.amount || 0)
        return acc
      }, {})

    // Predefined colors for common categories (using lowercase for matching)
    const categoryColors: { [key: string]: string } = {
      'food': '#ff6b6b',           // Red for food
      'groceries': '#ff6b6b',      // Red for groceries
      'restaurant': '#ff6b6b',     // Red for restaurant
      'dining': '#ff6b6b',         // Red for dining
      'transport': '#4ecdc4',      // Teal for transport
      'travel': '#4ecdc4',         // Teal for travel
      'fuel': '#4ecdc4',           // Teal for fuel
      'taxi': '#4ecdc4',           // Teal for taxi
      'uber': '#4ecdc4',
      'ola': '#4ecdc4',           // Teal for uber
      'entertainment': '#45b7d1',  // Blue for entertainment
      'movies': '#45b7d1',         // Blue for movies
      'games': '#45b7d1',          // Blue for games
      'shopping': '#f9ca24',       // Yellow for shopping
      'clothes': '#f9ca24',        // Yellow for clothes
      'electronics': '#f9ca24',    // Yellow for electronics
      'utilities': '#6c5ce7',      // Purple for utilities
      'electricity': '#6c5ce7',    // Purple for electricity
      'water': '#6c5ce7',          // Purple for water
      'internet': '#6c5ce7',        // Purple for internet
      'rent': '#fd79a8',           // Pink for rent
      'housing': '#fd79a8',
      'maid': '#fd79a8',
      'househelp': '#fd79a8',        // Pink for housing
      'healthcare': '#00b894',     // Green for healthcare
      'medical': '#00b894',        // Green for medical
      'pharmacy': '#00b894',       // Green for pharmacy
      'education': '#a29bfe',      // Light purple for education
      'books': '#a29bfe',          // Light purple for books
      'courses': '#a29bfe',        // Light purple for courses
      'other': '#636e72',          // Gray for other
    }

    // Function to get color for category
    const getCategoryColor = (categoryName: string): string => {
      const lowerName = categoryName.toLowerCase()
      return categoryColors[lowerName] || generateRandomColor()
    }

    // Generate random color if not in predefined list
    const generateRandomColor = (): string => {
      const hue = Math.floor(Math.random() * 360)
      const saturation = 65 + Math.floor(Math.random() * 20) // 65-85%
      const lightness = 45 + Math.floor(Math.random() * 20)  // 45-65%
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`
    }

    return Object.entries(categories)
      .map(([name, value]) => ({
        name,
        value: value as number,
        color: getCategoryColor(name)
      }))
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 6)
  }, [finances])

  async function addEntry() {
    if (!newEntry.type || !newEntry.amount || !newEntry.category) return

    setIsSubmitting(true)
    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error("No authenticated user")
      }

      const idToken = await user.getIdToken()
      const response = await fetch("/api/finances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          ...newEntry,
          amount: parseFloat(newEntry.amount)
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to add transaction: ${response.status}`)
      }

      await mutate() // Refresh data
      setNewEntry({
        type: "",
        amount: "",
        category: "",
        description: "",
        currency: "INR",
        payment_method: "",
      })
    } catch (error) {
      console.error("Error adding transaction:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (error) {
    return (
      <PageLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
            <p className="text-muted-foreground mb-4">
              {error.message || "Failed to load financial data"}
            </p>
            <Button onClick={() => mutate()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Financial Dashboard"
      description={`Welcome back${user?.displayName ? `, ${user.displayName}` : ''}! Here's your financial overview.`}
      maxWidth="max-w-7xl"
    >
      <div className="flex justify-end mb-6">
        <Button onClick={() => mutate()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    ₹{summary.totalIncome.toLocaleString()}
                  </p>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-red-600">
                    ₹{summary.totalExpenses.toLocaleString()}
                  </p>
                )}
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Savings</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className={`text-2xl font-bold ${summary.netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{summary.netSavings.toLocaleString()}
                  </p>
                )}
              </div>
              <PiggyBank className={`w-8 h-8 ${summary.netSavings >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Transactions</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.aiGeneratedCount}
                  </p>
                )}
              </div>
              <CreditCard className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Income vs Expenses Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5" />
              Income vs Expenses (Last 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, '']} />
                  <Bar dataKey="income" fill="#10b981" name="Income" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No transaction data available</p>
                  <p className="text-sm">Add some transactions to see your chart</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No expense data available</p>
                  <p className="text-sm">Add some expenses to see the breakdown</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Transaction Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Transaction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="type">Type *</Label>
              <Select value={newEntry.type} onValueChange={(value) => setNewEntry((e) => ({ ...e, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={newEntry.amount}
                onChange={(e) => setNewEntry((entry) => ({ ...entry, amount: e.target.value }))}
                placeholder="e.g., 5000"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={newEntry.category}
                onChange={(e) => setNewEntry((entry) => ({ ...entry, category: e.target.value }))}
                placeholder="e.g., Salary, Food, Transport"
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={newEntry.currency} onValueChange={(value) => setNewEntry((e) => ({ ...e, currency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={newEntry.payment_method} onValueChange={(value) => setNewEntry((e) => ({ ...e, payment_method: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="wallet">Digital Wallet</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newEntry.description}
                onChange={(e) => setNewEntry((entry) => ({ ...entry, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={addEntry}
              disabled={isSubmitting || !newEntry.type || !newEntry.amount || !newEntry.category}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Transaction
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : finances.length > 0 ? (
            <div className="space-y-4">
              {finances.slice(0, 10).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' :
                      item.type === 'expense' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' :
                      'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                    }`}>
                      {item.type === 'income' ? <TrendingUp className="w-5 h-5" /> :
                       item.type === 'expense' ? <TrendingDown className="w-5 h-5" /> :
                       <DollarSign className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {item.date?.split('T')[0]} - {item.category}
                        </p>
                        {item.ai_generated && (
                          <Badge variant="secondary" className="text-xs">
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description || 'No description'}
                        {item.payment_method && ` • ${item.payment_method}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      item.type === 'income' ? 'text-green-600 dark:text-green-400' :
                      item.type === 'expense' ? 'text-red-600 dark:text-red-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>
                      {item.type === 'income' ? '+' : item.type === 'expense' ? '-' : ''}
                      {item.currency === 'INR' ? '₹' : item.currency === 'USD' ? '$' : '€'}
                      {item.amount?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first transaction above, or chat with A.I.D.A. to automatically track expenses!
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/chat'}>
                Chat with A.I.D.A.
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  )
}
