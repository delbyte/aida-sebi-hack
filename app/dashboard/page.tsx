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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import { auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { TrendingUp, TrendingDown, DollarSign, CreditCard, PiggyBank, AlertCircle, Plus, RefreshCw, TrendingUp as TrendingUpIcon, Edit, Trash2, Target, Percent, Briefcase } from "lucide-react"
import { PageLayout } from "@/components/page-layout"

const fetcher = async (url: string) => {
  // Wait for auth to be ready
  await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe()
      resolve(user)
    })
  })

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
  const [user, loading] = useAuthState(auth)

  const { data, error, mutate, isLoading } = useSWR(
    user ? '/api/finances' : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true
    }
  )

  const [newEntry, setNewEntry] = React.useState({
    type: "",
    amount: "",
    category: "",
    description: "",
    currency: "INR",
    payment_method: "",
  })

  const [newInvestment, setNewInvestment] = React.useState({
    type: "stocks",
    name: "",
    amount: "",
    current_value: "",
    quantity: "",
    purchase_price: "",
    purchase_date: "",
    broker: "",
  })

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSubmittingInvestment, setIsSubmittingInvestment] = React.useState(false)
  const [editingInvestment, setEditingInvestment] = React.useState<any>(null)

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

  // Calculate investment statistics
  const investmentSummary = React.useMemo(() => {
    const investments = finances.filter((f: any) => f.type === 'investment')
    
    const totalInvested = investments.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
    const currentValue = investments.reduce((sum: number, inv: any) => sum + (inv.current_value || inv.amount || 0), 0)
    const totalReturn = currentValue - totalInvested
    const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

    const byType = investments.reduce((acc: any, inv: any) => {
      const type = inv.category || 'other'
      acc[type] = (acc[type] || 0) + (inv.current_value || inv.amount || 0)
      return acc
    }, {})

    return { 
      totalInvested, 
      currentValue, 
      totalReturn, 
      returnPercentage, 
      byType,
      count: investments.length 
    }
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

  // Investment data for charts
  const investmentData = React.useMemo(() => {
    const investments = finances.filter((f: any) => f.type === 'investment')

    const byType = investments.reduce((acc: any, inv: any) => {
      const type = inv.category || 'other'
      acc[type] = (acc[type] || 0) + (inv.current_value || inv.amount || 0)
      return acc
    }, {})

    // Enhanced color system for investment types (similar to expense categories)
    const investmentColors: { [key: string]: string } = {
      // Stocks & Equities
      'stocks': '#10b981',           // Emerald green for stocks
      'equity': '#10b981',           // Emerald green for equity
      'shares': '#10b981',           // Emerald green for shares
      'equities': '#10b981',         // Emerald green for equities

      // Mutual Funds
      'mutual_funds': '#3b82f6',     // Blue for mutual funds
      'mutual fund': '#3b82f6',      // Blue for mutual fund
      'mf': '#3b82f6',               // Blue for MF
      'sip': '#3b82f6',              // Blue for SIP

      // Bonds & Fixed Income
      'bonds': '#8b5cf6',            // Purple for bonds
      'bond': '#8b5cf6',             // Purple for bond
      'debentures': '#8b5cf6',       // Purple for debentures
      'fixed income': '#8b5cf6',     // Purple for fixed income

      // Fixed Deposits
      'fd': '#f59e0b',               // Amber for fixed deposits
      'fixed deposit': '#f59e0b',    // Amber for fixed deposit
      'fixed_deposit': '#f59e0b',    // Amber for fixed_deposit
      'term deposit': '#f59e0b',     // Amber for term deposit

      // Gold & Precious Metals
      'gold': '#f97316',             // Orange for gold
      'silver': '#f97316',           // Orange for silver
      'platinum': '#f97316',         // Orange for platinum
      'commodities': '#f97316',      // Orange for commodities

      // Cryptocurrency
      'crypto': '#6366f1',           // Indigo for crypto
      'cryptocurrency': '#6366f1',   // Indigo for cryptocurrency
      'bitcoin': '#6366f1',          // Indigo for bitcoin
      'ethereum': '#6366f1',         // Indigo for ethereum
      'blockchain': '#6366f1',       // Indigo for blockchain

      // Real Estate
      'real estate': '#ec4899',      // Pink for real estate
      'property': '#ec4899',         // Pink for property
      'land': '#ec4899',             // Pink for land
      'reit': '#ec4899',             // Pink for REIT

      // ETFs & Index Funds
      'etf': '#06b6d4',              // Cyan for ETFs
      'index fund': '#06b6d4',       // Cyan for index fund
      'index_fund': '#06b6d4',       // Cyan for index_fund

      // Insurance
      'insurance': '#84cc16',        // Lime for insurance
      'life insurance': '#84cc16',   // Lime for life insurance
      'ulip': '#84cc16',             // Lime for ULIP

      // Other Investments
      'other': '#6b7280',            // Gray for other
      'miscellaneous': '#6b7280',    // Gray for miscellaneous
      'alternative': '#6b7280',      // Gray for alternative
    }

    // Function to get color for investment type
    const getInvestmentColor = (investmentType: string): string => {
      const lowerType = investmentType.toLowerCase().replace(/\s+/g, '_')
      return investmentColors[lowerType] || generateRandomColor()
    }

    // Generate random color if not in predefined list
    const generateRandomColor = (): string => {
      const hue = Math.floor(Math.random() * 360)
      const saturation = 65 + Math.floor(Math.random() * 20) // 65-85%
      const lightness = 45 + Math.floor(Math.random() * 20)  // 45-65%
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`
    }

    return Object.entries(byType)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' ').toUpperCase(),
        value: value as number,
        color: getInvestmentColor(name)
      }))
      .sort((a, b) => b.value - a.value)
  }, [finances])

  // Investment chart data processing
  const investmentChartData = React.useMemo(() => {
    const investments = finances.filter((f: any) => f.type === 'investment')
    const monthlyData: { [key: string]: { invested: number; current: number } } = {}

    investments.forEach((inv: any) => {
      const date = new Date(inv.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { invested: 0, current: 0 }
      }

      monthlyData[monthKey].invested += inv.amount
      monthlyData[monthKey].current += inv.current_value || inv.amount
    })

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({
        month,
        invested: values.invested,
        current: values.current,
        return: values.current - values.invested
      }))
  }, [finances])

  const investmentTypeData = React.useMemo(() => {
    const investments = finances.filter((f: any) => f.type === 'investment')
    const typeTotals: { [key: string]: { invested: number; current: number } } = {}

    investments.forEach((inv: any) => {
      const type = inv.investment_type || inv.category || 'Other'
      if (!typeTotals[type]) {
        typeTotals[type] = { invested: 0, current: 0 }
      }
      typeTotals[type].invested += inv.amount
      typeTotals[type].current += inv.current_value || inv.amount
    })

    return Object.entries(typeTotals).map(([type, values]) => ({
      type,
      invested: values.invested,
      current: values.current,
      return: values.current - values.invested
    }))
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
      // Error adding transaction
    } finally {
      setIsSubmitting(false)
    }
  }

  async function addInvestment() {
    if (!newInvestment.name || !newInvestment.amount) return

    setIsSubmittingInvestment(true)
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
          type: "investment",
          category: newInvestment.type,
          amount: parseFloat(newInvestment.amount),
          current_value: newInvestment.current_value ? parseFloat(newInvestment.current_value) : parseFloat(newInvestment.amount),
          description: `${newInvestment.name}${newInvestment.quantity ? ` (${newInvestment.quantity} units)` : ''}${newInvestment.broker ? ` - ${newInvestment.broker}` : ''}`,
          currency: "INR",
          payment_method: "bank_transfer",
          investment_type: newInvestment.type,
          units: newInvestment.quantity ? parseFloat(newInvestment.quantity) : null,
          price_per_unit: newInvestment.purchase_price ? parseFloat(newInvestment.purchase_price) : null,
          date: newInvestment.purchase_date || new Date().toISOString().split('T')[0]
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to add investment: ${response.status}`)
      }

      await mutate() // Refresh data
      setNewInvestment({
        type: "stocks",
        name: "",
        amount: "",
        current_value: "",
        quantity: "",
        purchase_price: "",
        purchase_date: "",
        broker: "",
      })
    } catch (error) {
      // Error adding investment
    } finally {
      setIsSubmittingInvestment(false)
    }
  }

  async function deleteInvestment(investmentId: string) {
    if (!confirm('Are you sure you want to delete this investment?')) return

    try {
      const user = auth.currentUser
      if (!user) return

      const idToken = await user.getIdToken()
      const response = await fetch(`/api/finances/${investmentId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        await mutate() // Refresh data
      }
    } catch (error) {
      // Error deleting investment
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
      description={`Welcome back${!loading && user?.displayName ? `, ${user.displayName}` : ''}! Here's your financial overview.`}
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

      {/* Investment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invested</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{investmentSummary.totalInvested.toLocaleString()}
                  </p>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Value</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    ₹{investmentSummary.currentValue.toLocaleString()}
                  </p>
                )}
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Return</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className={`text-2xl font-bold ${investmentSummary.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{investmentSummary.totalReturn.toLocaleString()}
                  </p>
                )}
              </div>
              <BarChart className={`w-8 h-8 ${investmentSummary.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Return %</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className={`text-2xl font-bold ${investmentSummary.returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {investmentSummary.returnPercentage.toFixed(2)}%
                  </p>
                )}
              </div>
              <Percent className={`w-8 h-8 ${investmentSummary.returnPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Investment Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="w-5 h-5" />
              Investment Performance Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : investmentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={investmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, '']} />
                  <Line type="monotone" dataKey="invested" stroke="#3b82f6" name="Invested" strokeWidth={2} />
                  <Line type="monotone" dataKey="current" stroke="#10b981" name="Current Value" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <LineChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No investment data available</p>
                  <p className="text-sm">Add some investments to see your performance chart</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investment Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Investment Portfolio by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : investmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={investmentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {investmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`₹${value}`, 'Value']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No investment data available</p>
                  <p className="text-sm">Add some investments to see the portfolio breakdown</p>
                </div>
              </div>
            )}
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
                    innerRadius={50}
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

      {/* Add Investment Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Investment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="investment-type">Investment Type *</Label>
              <Select value={newInvestment.type} onValueChange={(value) => setNewInvestment((e) => ({ ...e, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="mutual_funds">Mutual Funds</SelectItem>
                  <SelectItem value="bonds">Bonds</SelectItem>
                  <SelectItem value="fd">Fixed Deposit</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="investment-name">Investment Name *</Label>
              <Input
                id="investment-name"
                value={newInvestment.name}
                onChange={(e) => setNewInvestment((inv) => ({ ...inv, name: e.target.value }))}
                placeholder="e.g., Reliance Industries, HDFC Bank"
              />
            </div>

            <div>
              <Label htmlFor="investment-amount">Invested Amount *</Label>
              <Input
                id="investment-amount"
                type="number"
                value={newInvestment.amount}
                onChange={(e) => setNewInvestment((inv) => ({ ...inv, amount: e.target.value }))}
                placeholder="e.g., 10000"
              />
            </div>

            <div>
              <Label htmlFor="current-value">Current Value</Label>
              <Input
                id="current-value"
                type="number"
                value={newInvestment.current_value}
                onChange={(e) => setNewInvestment((inv) => ({ ...inv, current_value: e.target.value }))}
                placeholder="Leave empty if same as invested"
              />
            </div>

            <div>
              <Label htmlFor="quantity">Quantity/Units</Label>
              <Input
                id="quantity"
                type="number"
                value={newInvestment.quantity}
                onChange={(e) => setNewInvestment((inv) => ({ ...inv, quantity: e.target.value }))}
                placeholder="e.g., 50 shares"
              />
            </div>

            <div>
              <Label htmlFor="purchase-price">Purchase Price per Unit</Label>
              <Input
                id="purchase-price"
                type="number"
                value={newInvestment.purchase_price}
                onChange={(e) => setNewInvestment((inv) => ({ ...inv, purchase_price: e.target.value }))}
                placeholder="e.g., 200"
              />
            </div>

            <div>
              <Label htmlFor="purchase-date">Purchase Date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={newInvestment.purchase_date}
                onChange={(e) => setNewInvestment((inv) => ({ ...inv, purchase_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="broker">Broker/Platform</Label>
              <Input
                id="broker"
                value={newInvestment.broker}
                onChange={(e) => setNewInvestment((inv) => ({ ...inv, broker: e.target.value }))}
                placeholder="e.g., Zerodha, Groww"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={addInvestment}
              disabled={isSubmittingInvestment || !newInvestment.name || !newInvestment.amount}
              className="flex-1"
            >
              {isSubmittingInvestment ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding Investment...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Investment
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

      {/* Investment Portfolio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Investment Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : finances.filter((f: any) => f.type === 'investment').length > 0 ? (
            <div className="space-y-4">
              {finances.filter((f: any) => f.type === 'investment').slice(0, 10).map((item: any) => {
                const returnAmount = (item.current_value || item.amount) - item.amount
                const returnPercentage = item.amount > 0 ? ((returnAmount / item.amount) * 100) : 0

                return (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 flex items-center justify-center">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {item.description || item.category}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {item.investment_type || item.category || 'Other'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.date?.split('T')[0]}
                          {item.units && ` • ${item.units} units`}
                          {item.price_per_unit && ` • ₹${item.price_per_unit}/unit`}
                          {item.payment_method && ` • ${item.payment_method}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="font-semibold text-blue-600">
                          ₹{(item.current_value || item.amount).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Invested: ₹{item.amount?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className={`font-semibold ${returnAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {returnAmount >= 0 ? '+' : ''}₹{returnAmount.toLocaleString()}
                        </p>
                        <p className={`text-sm ${returnAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteInvestment(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No investments yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your investment portfolio by adding your first investment above!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  )
}
