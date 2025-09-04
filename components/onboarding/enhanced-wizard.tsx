"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, User } from "firebase/auth"
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Plus, Trash2 } from "lucide-react"

interface OnboardingStep {
  id: string
  title: string
  description: string
  fields: string[]
  required: boolean
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'basic_info',
    title: 'Basic Information',
    description: 'Let\'s start with some basic details about you',
    fields: ['full_name', 'email', 'phone', 'date_of_birth', 'gender', 'occupation', 'employment_type'],
    required: true
  },
  {
    id: 'financial_profile',
    title: 'Financial Profile',
    description: 'Tell us about your financial situation',
    fields: ['monthly_income', 'currency', 'risk_tolerance', 'investment_horizon'],
    required: true
  },
  {
    id: 'banking_info',
    title: 'Banking Information (OPTIONAL)',
    description: 'Help us understand your banking setup',
    fields: ['primary_bank', 'bank_accounts'],
    required: false
  },
  {
    id: 'goals_budget',
    title: 'Goals & Budget',
    description: 'What are your financial goals and spending patterns?',
    fields: ['goals', 'monthly_budgets'],
    required: true
  },
  {
    id: 'credit_debt',
    title: 'Credit & Debt (OPTIONAL)',
    description: 'Information about your credit cards and loans',
    fields: ['credit_cards', 'loans'],
    required: false
  },
  {
    id: 'investments',
    title: 'Investments (OPTIONAL)',
    description: 'Tell us about your investment portfolio',
    fields: ['investments'],
    required: false
  },
  {
    id: 'insurance',
    title: 'Insurance (OPTIONAL)',
    description: 'Your insurance coverage details',
    fields: ['insurance'],
    required: false
  }
]

interface OnboardingData {
  // Basic Info
  full_name: string
  email: string
  phone: string
  date_of_birth: string
  gender: string
  occupation: string
  employment_type: string

  // Financial Profile
  monthly_income: string
  currency: string
  risk_tolerance: number
  investment_horizon: string

  // Banking Info
  primary_bank: string
  bank_accounts: Array<{
    account_number: string
    bank_name: string
    account_type: string
    ifsc_code: string
  }>

  // Goals & Budget
  goals: {
    primary: string
    secondary: string[]
    target_amount: number
    target_date: string
    monthly_savings_target: number
  }
  monthly_budgets: {
    food: number
    transportation: number
    entertainment: number
    shopping: number
    utilities: number
    rent: number
    insurance: number
    investments: number
    miscellaneous: number
  }

  // Credit & Debt
  credit_cards: Array<{
    card_name: string
    bank_name: string
    credit_limit: number
    outstanding_balance: number
    due_date: number
    minimum_due: number
  }>
  loans: Array<{
    loan_type: string
    lender: string
    principal_amount: number
    outstanding_balance: number
    monthly_emi: number
    interest_rate: number
    tenure_remaining: number
  }>

  // Investments
  investments: {
    mutual_funds: Array<{
      fund_name: string
      amc: string
      investment_amount: number
      current_value: number
      sip_amount: number
    }>
    stocks: Array<{
      company: string
      quantity: number
      average_price: number
      current_price: number
    }>
    fixed_deposits: Array<{
      bank: string
      principal: number
      interest_rate: number
      maturity_date: string
    }>
  }

  // Insurance
  insurance: {
    life_insurance: Array<{
      policy_name: string
      provider: string
      sum_assured: number
      premium_amount: number
      premium_frequency: string
    }>
    health_insurance: Array<{
      policy_name: string
      provider: string
      sum_assured: number
      premium_amount: number
    }>
    vehicle_insurance: Array<{
      policy_name: string
      provider: string
      vehicle_type: string
      premium_amount: number
    }>
  }
}

export function EnhancedOnboardingWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [user, setUser] = React.useState<User | null>(null)
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set())

  // Utility function for Indian number formatting
  const formatIndianNumber = (value: string | number): string => {
    if (!value) return ''
    const numStr = value.toString().replace(/,/g, '')
    const num = parseFloat(numStr)
    if (isNaN(num)) return value.toString()

    return num.toLocaleString('en-IN')
  }

  // Utility function to parse formatted number back to plain number
  const parseFormattedNumber = (value: string | number | undefined | null): number => {
    if (!value) return 0
    const stringValue = typeof value === 'string' ? value : value.toString()
    return parseFloat(stringValue.replace(/,/g, '')) || 0
  }

  const [data, setData] = React.useState<OnboardingData>({
    // Basic Info
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    occupation: "",
    employment_type: "",

    // Financial Profile
    monthly_income: "",
    currency: "INR",
    risk_tolerance: 5,
    investment_horizon: "medium",

    // Banking Info
    primary_bank: "",
    bank_accounts: [],

    // Goals & Budget
    goals: {
      primary: "",
      secondary: [],
      target_amount: 0,
      target_date: "",
      monthly_savings_target: 0
    },
    monthly_budgets: {
      food: 0,
      transportation: 0,
      entertainment: 0,
      shopping: 0,
      utilities: 0,
      rent: 0,
      insurance: 0,
      investments: 0,
      miscellaneous: 0
    },

    // Credit & Debt
    credit_cards: [],
    loans: [],

    // Investments
    investments: {
      mutual_funds: [],
      stocks: [],
      fixed_deposits: []
    },

    // Insurance
    insurance: {
      life_insurance: [],
      health_insurance: [],
      vehicle_insurance: []
    }
  })

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('🔑 Auth state changed in enhanced onboarding:', currentUser?.uid, currentUser?.email)
      setUser(currentUser)
      if (!currentUser) {
        console.log('❌ No authenticated user, redirecting to home')
        router.push("/")
        return
      }

      // Check if user has already completed onboarding
      try {
        console.log('🔍 Checking if user has completed onboarding...')
        const idToken = await currentUser.getIdToken()
        const profileResponse = await fetch("/api/profile", {
          headers: {
            "Authorization": `Bearer ${idToken}`,
          },
        })

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          const onboardingComplete = profileData.profile?.onboarding_complete === true
          
          if (onboardingComplete) {
            console.log('✅ User has already completed onboarding, redirecting to dashboard')
            router.push("/dashboard")
            return
          } else {
            console.log('📝 User needs to complete onboarding')
          }
        } else {
          console.log('⚠️ Could not fetch profile, proceeding with onboarding')
        }
      } catch (error) {
        console.error('❌ Error checking onboarding status:', error)
      }
    })
    return unsubscribe
  }, [router])

  const currentStepData = ONBOARDING_STEPS[currentStep]
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100

  function next() {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      setCurrentStep(s => s + 1)
    }
  }

  function prev() {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1)
    }
  }

  function isStepValid(stepIndex: number): boolean {
    const step = ONBOARDING_STEPS[stepIndex]
    if (!step.required) return true

    switch (step.id) {
      case 'basic_info':
        return !!(data.full_name && data.email && data.occupation)
      case 'financial_profile':
        return !!(data.monthly_income && data.currency)
      case 'goals_budget':
        return !!(data.goals.primary && Object.values(data.monthly_budgets).some(amount => amount > 0))
      default:
        return true
    }
  }

  async function save() {
    if (!user) {
      console.error("❌ No authenticated user")
      return
    }

    setSaving(true)
    try {
      console.log('🔑 Getting ID token for enhanced onboarding save')
      const idToken = await user.getIdToken()

      console.log('📤 Making POST request to /api/profile from enhanced onboarding')
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          ...data,
          onboarding_complete: true,
          onboarding_step: ONBOARDING_STEPS.length
        }),
      })

      console.log('📡 Enhanced onboarding POST Response status:', res.status)
      if (res.ok) {
        const responseData = await res.json()
        console.log('✅ Enhanced onboarding save successful')
        router.push("/chat")
      } else {
        const errorText = await res.text()
        console.error('❌ Enhanced onboarding save failed:', res.status, errorText)
      }
    } catch (error) {
      console.error('❌ Error saving enhanced onboarding:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateData = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const updateNestedData = (path: string, value: any) => {
    const keys = path.split('.')
    setData(prev => {
      const newData = { ...prev }
      let current = newData as any
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome to A.I.D.A.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Let's set up your comprehensive financial profile to get personalized insights
          </p>
        </div>

        <div className="space-y-8">
        {/* Progress Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">Setup Progress</h2>
                <p className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {ONBOARDING_STEPS.length}
                </p>
              </div>
              <Badge variant="secondary" className="text-sm">
                {Math.round(progress)}% Complete
              </Badge>
            </div>
            <Progress value={progress} className="h-3 mb-4" />

            {/* Step Indicators */}
            <div className="grid grid-cols-7 gap-2">
              {ONBOARDING_STEPS.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center text-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index < currentStep ? <CheckCircle className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className="text-xs font-medium leading-tight">
                    {step.title.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
                <p className="text-muted-foreground mt-1">{currentStepData.description}</p>
              </div>
              {currentStepData.required && (
                <Badge variant="secondary">Required</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Basic Info Step */}
            {currentStepData.id === 'basic_info' && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={data.full_name}
                    onChange={(e) => updateData('full_name', e.target.value)}
                    placeholder="Enter your full name"
                    className="h-11 placeholder-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => updateData('email', e.target.value)}
                    placeholder="your.email@example.com"
                    className="h-11 placeholder-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={data.phone}
                    onChange={(e) => updateData('phone', e.target.value)}
                    placeholder="+91 9876543210"
                    className="h-11 placeholder-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={data.date_of_birth}
                    onChange={(e) => updateData('date_of_birth', e.target.value)}
                    className="h-11 placeholder-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={data.gender} onValueChange={(value) => updateData('gender', value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation *</Label>
                  <Input
                    id="occupation"
                    value={data.occupation}
                    onChange={(e) => updateData('occupation', e.target.value)}
                    placeholder="Software Engineer, Doctor, etc."
                    className="h-11 placeholder-light"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <Select value={data.employment_type} onValueChange={(value) => updateData('employment_type', value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salaried">Salaried</SelectItem>
                      <SelectItem value="self-employed">Self-employed</SelectItem>
                      <SelectItem value="business">Business Owner</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Financial Profile Step */}
            {currentStepData.id === 'financial_profile' && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monthly_income">Monthly Income (₹) *</Label>
                  <Input
                    id="monthly_income"
                    type="text"
                    value={data.monthly_income ? formatIndianNumber(data.monthly_income) : ''}
                    onChange={(e) => updateData('monthly_income', parseFormattedNumber(e.target.value))}
                    placeholder="50,000"
                    className="h-11 placeholder-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Income (₹)</Label>
                  <div className="h-11 px-3 py-2 bg-muted rounded-md border flex items-center text-sm text-muted-foreground">
                    {data.monthly_income ? formatIndianNumber(parseFormattedNumber(data.monthly_income) * 12) : '0'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select value={data.currency} onValueChange={(value) => updateData('currency', value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investment_horizon">Investment Horizon</Label>
                  <Select value={data.investment_horizon} onValueChange={(value) => updateData('investment_horizon', value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select horizon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short-term (1-3 years)</SelectItem>
                      <SelectItem value="medium">Medium-term (3-7 years)</SelectItem>
                      <SelectItem value="long">Long-term (7+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4 md:col-span-2">
                  <Label htmlFor="risk_tolerance">Risk Tolerance: {data.risk_tolerance}/10</Label>
                  <div className="bg-gray-300 rounded-full p-4 py-6 transition-all duration-300 ease-in-out">
                    <Slider
                      value={[data.risk_tolerance]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(value) => updateData('risk_tolerance', value[0])}
                      className="py-2 [&_[role=slider]]:transition-all [&_[role=slider]]:duration-300 [&_[role=slider]]:ease-out [&_[role=slider]]:hover:scale-110 [&_[role=slider]]:active:scale-125"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Conservative</span>
                    <span>Moderate</span>
                    <span>Aggressive</span>
                  </div>
                </div>
              </div>
            )}

            {/* Banking Info Step */}
            {currentStepData.id === 'banking_info' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="primary_bank">Primary Bank</Label>
                  <Input
                    id="primary_bank"
                    value={data.primary_bank}
                    onChange={(e) => updateData('primary_bank', e.target.value)}
                    placeholder="e.g., HDFC Bank, ICICI Bank"
                    className="h-11 placeholder-light"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Bank Accounts</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newAccounts = [...data.bank_accounts, {
                          account_number: '',
                          bank_name: '',
                          account_type: 'savings',
                          ifsc_code: ''
                        }]
                        updateData('bank_accounts', newAccounts)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Account
                    </Button>
                  </div>

                  {data.bank_accounts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No bank accounts added yet.</p>
                      <p className="text-sm">Click "Add Account" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.bank_accounts.map((account, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-medium">Account {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newAccounts = data.bank_accounts.filter((_, i) => i !== index)
                                updateData('bank_accounts', newAccounts)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Account Number</Label>
                              <Input
                                value={account.account_number}
                                onChange={(e) => {
                                  const newAccounts = [...data.bank_accounts]
                                  newAccounts[index].account_number = e.target.value
                                  updateData('bank_accounts', newAccounts)
                                }}
                                placeholder="Enter account number"
                                className="h-9 placeholder-light"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Bank Name</Label>
                              <Input
                                value={account.bank_name}
                                onChange={(e) => {
                                  const newAccounts = [...data.bank_accounts]
                                  newAccounts[index].bank_name = e.target.value
                                  updateData('bank_accounts', newAccounts)
                                }}
                                placeholder="e.g., HDFC Bank"
                                className="h-9 placeholder-light"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Account Type</Label>
                              <Select
                                value={account.account_type}
                                onValueChange={(value) => {
                                  const newAccounts = [...data.bank_accounts]
                                  newAccounts[index].account_type = value
                                  updateData('bank_accounts', newAccounts)
                                }}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="savings">Savings</SelectItem>
                                  <SelectItem value="current">Current</SelectItem>
                                  <SelectItem value="salary">Salary</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>IFSC Code</Label>
                              <Input
                                value={account.ifsc_code}
                                onChange={(e) => {
                                  const newAccounts = [...data.bank_accounts]
                                  newAccounts[index].ifsc_code = e.target.value
                                  updateData('bank_accounts', newAccounts)
                                }}
                                placeholder="e.g., HDFC0001234"
                                className="h-9 placeholder-light"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Goals & Budget Step */}
            {currentStepData.id === 'goals_budget' && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <Label htmlFor="primary_goal">Primary Financial Goal *</Label>
                  <Textarea
                    id="primary_goal"
                    value={data.goals.primary}
                    onChange={(e) => updateNestedData('goals.primary', e.target.value)}
                    placeholder="e.g., Save for a house down payment, build emergency fund, pay off debt, etc."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="target_amount">Target Amount (₹)</Label>
                    <Input
                      id="target_amount"
                      type="text"
                      value={data.goals.target_amount ? formatIndianNumber(data.goals.target_amount) : ''}
                      onChange={(e) => updateNestedData('goals.target_amount', parseFormattedNumber(e.target.value))}
                      placeholder="10,00,000"
                      className="h-11 placeholder-light"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_date">Target Date</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={data.goals.target_date}
                      onChange={(e) => updateNestedData('goals.target_date', e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly_savings">Monthly Savings Target (₹)</Label>
                    <Input
                      id="monthly_savings"
                      type="text"
                      value={data.goals.monthly_savings_target ? formatIndianNumber(data.goals.monthly_savings_target) : ''}
                      onChange={(e) => updateNestedData('goals.monthly_savings_target', parseFormattedNumber(e.target.value))}
                      placeholder="15,000"
                      className="h-11 placeholder-light"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Monthly Budget Allocation *</Label>
                  <p className="text-sm text-muted-foreground">Allocate your monthly income across different categories</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(data.monthly_budgets).map(([category, amount]) => (
                      <div key={category} className="space-y-2">
                        <Label htmlFor={category} className="capitalize text-sm">
                          {category.replace('_', ' ')} (₹)
                        </Label>
                        <Input
                          id={category}
                          type="text"
                          value={amount ? formatIndianNumber(amount) : ''}
                          onChange={(e) => updateNestedData(`monthly_budgets.${category}`, parseFormattedNumber(e.target.value))}
                          placeholder="0"
                          className="h-11 placeholder-light"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Credit & Debt Step */}
            {currentStepData.id === 'credit_debt' && (
              <div className="space-y-8">
                {/* Credit Cards */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Credit Cards</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newCards = [...data.credit_cards, {
                          card_name: '',
                          bank_name: '',
                          credit_limit: 0,
                          outstanding_balance: 0,
                          due_date: 1,
                          minimum_due: 0
                        }]
                        updateData('credit_cards', newCards)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Card
                    </Button>
                  </div>

                  {data.credit_cards.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No credit cards added yet.</p>
                      <p className="text-sm">Click "Add Card" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.credit_cards.map((card, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-medium">Card {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newCards = data.credit_cards.filter((_, i) => i !== index)
                                updateData('credit_cards', newCards)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Card Name</Label>
                              <Input
                                value={card.card_name}
                                onChange={(e) => {
                                  const newCards = [...data.credit_cards]
                                  newCards[index].card_name = e.target.value
                                  updateData('credit_cards', newCards)
                                }}
                                placeholder="e.g., HDFC Unnati"
                                className="h-9 placeholder-light"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Bank Name</Label>
                              <Input
                                value={card.bank_name}
                                onChange={(e) => {
                                  const newCards = [...data.credit_cards]
                                  newCards[index].bank_name = e.target.value
                                  updateData('credit_cards', newCards)
                                }}
                                placeholder="e.g., HDFC Bank"
                                className="h-9 placeholder-light"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Credit Limit (₹)</Label>
                              <Input
                                type="text"
                                value={card.credit_limit ? formatIndianNumber(card.credit_limit) : ''}
                                onChange={(e) => {
                                  const newCards = [...data.credit_cards]
                                  newCards[index].credit_limit = parseFormattedNumber(e.target.value)
                                  updateData('credit_cards', newCards)
                                }}
                                placeholder="50,000"
                                className="h-9 placeholder-light"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Outstanding Balance (₹)</Label>
                              <Input
                                type="text"
                                value={card.outstanding_balance ? formatIndianNumber(card.outstanding_balance) : ''}
                                onChange={(e) => {
                                  const newCards = [...data.credit_cards]
                                  newCards[index].outstanding_balance = parseFormattedNumber(e.target.value)
                                  updateData('credit_cards', newCards)
                                }}
                                placeholder="15,000"
                                className="h-9 placeholder-light"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Due Date</Label>
                              <Input
                                type="number"
                                min="1"
                                max="31"
                                value={card.due_date || ''}
                                onChange={(e) => {
                                  const newCards = [...data.credit_cards]
                                  newCards[index].due_date = Number(e.target.value) || 1
                                  updateData('credit_cards', newCards)
                                }}
                                placeholder="15"
                                className="h-9 placeholder-light"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Minimum Due (₹)</Label>
                              <Input
                                type="text"
                                value={card.minimum_due ? formatIndianNumber(card.minimum_due) : ''}
                                onChange={(e) => {
                                  const newCards = [...data.credit_cards]
                                  newCards[index].minimum_due = parseFormattedNumber(e.target.value)
                                  updateData('credit_cards', newCards)
                                }}
                                placeholder="500"
                                className="h-9 placeholder-light"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Loans */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Loans</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newLoans = [...data.loans, {
                          loan_type: 'personal',
                          lender: '',
                          principal_amount: 0,
                          outstanding_balance: 0,
                          monthly_emi: 0,
                          interest_rate: 0,
                          tenure_remaining: 0
                        }]
                        updateData('loans', newLoans)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Loan
                    </Button>
                  </div>

                  {data.loans.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No loans added yet.</p>
                      <p className="text-sm">Click "Add Loan" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.loans.map((loan, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-medium">Loan {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newLoans = data.loans.filter((_, i) => i !== index)
                                updateData('loans', newLoans)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Loan Type</Label>
                              <Select
                                value={loan.loan_type}
                                onValueChange={(value) => {
                                  const newLoans = [...data.loans]
                                  newLoans[index].loan_type = value
                                  updateData('loans', newLoans)
                                }}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="personal">Personal Loan</SelectItem>
                                  <SelectItem value="home">Home Loan</SelectItem>
                                  <SelectItem value="car">Car Loan</SelectItem>
                                  <SelectItem value="education">Education Loan</SelectItem>
                                  <SelectItem value="business">Business Loan</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Lender</Label>
                              <Input
                                value={loan.lender}
                                onChange={(e) => {
                                  const newLoans = [...data.loans]
                                  newLoans[index].lender = e.target.value
                                  updateData('loans', newLoans)
                                }}
                                placeholder="e.g., HDFC Bank"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Principal Amount (₹)</Label>
                              <Input
                                type="text"
                                value={loan.principal_amount ? formatIndianNumber(loan.principal_amount) : ''}
                                onChange={(e) => {
                                  const newLoans = [...data.loans]
                                  newLoans[index].principal_amount = parseFormattedNumber(e.target.value)
                                  updateData('loans', newLoans)
                                }}
                                placeholder="5,00,000"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Outstanding Balance (₹)</Label>
                              <Input
                                type="text"
                                value={loan.outstanding_balance ? formatIndianNumber(loan.outstanding_balance) : ''}
                                onChange={(e) => {
                                  const newLoans = [...data.loans]
                                  newLoans[index].outstanding_balance = parseFormattedNumber(e.target.value)
                                  updateData('loans', newLoans)
                                }}
                                placeholder="4,50,000"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Monthly EMI (₹)</Label>
                              <Input
                                type="text"
                                value={loan.monthly_emi ? formatIndianNumber(loan.monthly_emi) : ''}
                                onChange={(e) => {
                                  const newLoans = [...data.loans]
                                  newLoans[index].monthly_emi = parseFormattedNumber(e.target.value)
                                  updateData('loans', newLoans)
                                }}
                                placeholder="8,500"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Interest Rate (%)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={loan.interest_rate || ''}
                                onChange={(e) => {
                                  const newLoans = [...data.loans]
                                  newLoans[index].interest_rate = Number(e.target.value) || 0
                                  updateData('loans', newLoans)
                                }}
                                placeholder="12.5"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Tenure Remaining (months)</Label>
                              <Input
                                type="number"
                                value={loan.tenure_remaining || ''}
                                onChange={(e) => {
                                  const newLoans = [...data.loans]
                                  newLoans[index].tenure_remaining = Number(e.target.value) || 0
                                  updateData('loans', newLoans)
                                }}
                                placeholder="36"
                                className="h-9"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Investments Step */}
            {currentStepData.id === 'investments' && (
              <div className="space-y-8">
                {/* Mutual Funds */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Mutual Funds</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newFunds = [...data.investments.mutual_funds, {
                          fund_name: '',
                          amc: '',
                          investment_amount: 0,
                          current_value: 0,
                          sip_amount: 0
                        }]
                        updateNestedData('investments.mutual_funds', newFunds)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Fund
                    </Button>
                  </div>

                  {data.investments.mutual_funds.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No mutual funds added yet.</p>
                      <p className="text-sm">Click "Add Fund" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.investments.mutual_funds.map((fund, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-medium">Fund {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newFunds = data.investments.mutual_funds.filter((_, i) => i !== index)
                                updateNestedData('investments.mutual_funds', newFunds)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Fund Name</Label>
                              <Input
                                value={fund.fund_name}
                                onChange={(e) => {
                                  const newFunds = [...data.investments.mutual_funds]
                                  newFunds[index].fund_name = e.target.value
                                  updateNestedData('investments.mutual_funds', newFunds)
                                }}
                                placeholder="e.g., HDFC Small Cap Fund"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>AMC</Label>
                              <Input
                                value={fund.amc}
                                onChange={(e) => {
                                  const newFunds = [...data.investments.mutual_funds]
                                  newFunds[index].amc = e.target.value
                                  updateNestedData('investments.mutual_funds', newFunds)
                                }}
                                placeholder="e.g., HDFC Mutual Fund"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Investment Amount (₹)</Label>
                              <Input
                                type="text"
                                value={fund.investment_amount ? formatIndianNumber(fund.investment_amount) : ''}
                                onChange={(e) => {
                                  const newFunds = [...data.investments.mutual_funds]
                                  newFunds[index].investment_amount = parseFormattedNumber(e.target.value)
                                  updateNestedData('investments.mutual_funds', newFunds)
                                }}
                                placeholder="50,000"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Current Value (₹)</Label>
                              <Input
                                type="text"
                                value={fund.current_value ? formatIndianNumber(fund.current_value) : ''}
                                onChange={(e) => {
                                  const newFunds = [...data.investments.mutual_funds]
                                  newFunds[index].current_value = parseFormattedNumber(e.target.value)
                                  updateNestedData('investments.mutual_funds', newFunds)
                                }}
                                placeholder="55,000"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Monthly SIP Amount (₹)</Label>
                              <Input
                                type="text"
                                value={fund.sip_amount ? formatIndianNumber(fund.sip_amount) : ''}
                                onChange={(e) => {
                                  const newFunds = [...data.investments.mutual_funds]
                                  newFunds[index].sip_amount = parseFormattedNumber(e.target.value)
                                  updateNestedData('investments.mutual_funds', newFunds)
                                }}
                                placeholder="5,000"
                                className="h-9"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stocks */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Stocks</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newStocks = [...data.investments.stocks, {
                          company: '',
                          quantity: 0,
                          average_price: 0,
                          current_price: 0
                        }]
                        updateNestedData('investments.stocks', newStocks)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Stock
                    </Button>
                  </div>

                  {data.investments.stocks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No stocks added yet.</p>
                      <p className="text-sm">Click "Add Stock" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.investments.stocks.map((stock, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-medium">Stock {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newStocks = data.investments.stocks.filter((_, i) => i !== index)
                                updateNestedData('investments.stocks', newStocks)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Company</Label>
                              <Input
                                value={stock.company}
                                onChange={(e) => {
                                  const newStocks = [...data.investments.stocks]
                                  newStocks[index].company = e.target.value
                                  updateNestedData('investments.stocks', newStocks)
                                }}
                                placeholder="e.g., Reliance Industries"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                value={stock.quantity || ''}
                                onChange={(e) => {
                                  const newStocks = [...data.investments.stocks]
                                  newStocks[index].quantity = Number(e.target.value) || 0
                                  updateNestedData('investments.stocks', newStocks)
                                }}
                                placeholder="100"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Average Price (₹)</Label>
                              <Input
                                type="text"
                                value={stock.average_price ? formatIndianNumber(stock.average_price) : ''}
                                onChange={(e) => {
                                  const newStocks = [...data.investments.stocks]
                                  newStocks[index].average_price = parseFormattedNumber(e.target.value)
                                  updateNestedData('investments.stocks', newStocks)
                                }}
                                placeholder="2,500"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Current Price (₹)</Label>
                              <Input
                                type="text"
                                value={stock.current_price ? formatIndianNumber(stock.current_price) : ''}
                                onChange={(e) => {
                                  const newStocks = [...data.investments.stocks]
                                  newStocks[index].current_price = parseFormattedNumber(e.target.value)
                                  updateNestedData('investments.stocks', newStocks)
                                }}
                                placeholder="2,800"
                                className="h-9"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fixed Deposits */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Fixed Deposits</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newFDs = [...data.investments.fixed_deposits, {
                          bank: '',
                          principal: 0,
                          interest_rate: 0,
                          maturity_date: ''
                        }]
                        updateNestedData('investments.fixed_deposits', newFDs)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add FD
                    </Button>
                  </div>

                  {data.investments.fixed_deposits.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No fixed deposits added yet.</p>
                      <p className="text-sm">Click "Add FD" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.investments.fixed_deposits.map((fd, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-medium">FD {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newFDs = data.investments.fixed_deposits.filter((_, i) => i !== index)
                                updateNestedData('investments.fixed_deposits', newFDs)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Bank</Label>
                              <Input
                                value={fd.bank}
                                onChange={(e) => {
                                  const newFDs = [...data.investments.fixed_deposits]
                                  newFDs[index].bank = e.target.value
                                  updateNestedData('investments.fixed_deposits', newFDs)
                                }}
                                placeholder="e.g., HDFC Bank"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Principal Amount (₹)</Label>
                              <Input
                                type="text"
                                value={fd.principal ? formatIndianNumber(fd.principal) : ''}
                                onChange={(e) => {
                                  const newFDs = [...data.investments.fixed_deposits]
                                  newFDs[index].principal = parseFormattedNumber(e.target.value)
                                  updateNestedData('investments.fixed_deposits', newFDs)
                                }}
                                placeholder="1,00,000"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Interest Rate (%)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={fd.interest_rate || ''}
                                onChange={(e) => {
                                  const newFDs = [...data.investments.fixed_deposits]
                                  newFDs[index].interest_rate = Number(e.target.value) || 0
                                  updateNestedData('investments.fixed_deposits', newFDs)
                                }}
                                placeholder="6.5"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Maturity Date</Label>
                              <Input
                                type="date"
                                value={fd.maturity_date}
                                onChange={(e) => {
                                  const newFDs = [...data.investments.fixed_deposits]
                                  newFDs[index].maturity_date = e.target.value
                                  updateNestedData('investments.fixed_deposits', newFDs)
                                }}
                                className="h-9"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Insurance Step */}
            {currentStepData.id === 'insurance' && (
              <div className="space-y-8">
                {/* Life Insurance */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Life Insurance</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPolicies = [...data.insurance.life_insurance, {
                          policy_name: '',
                          provider: '',
                          sum_assured: 0,
                          premium_amount: 0,
                          premium_frequency: 'yearly'
                        }]
                        updateNestedData('insurance.life_insurance', newPolicies)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Policy
                    </Button>
                  </div>

                  {data.insurance.life_insurance.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No life insurance policies added yet.</p>
                      <p className="text-sm">Click "Add Policy" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.insurance.life_insurance.map((policy, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-medium">Policy {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newPolicies = data.insurance.life_insurance.filter((_, i) => i !== index)
                                updateNestedData('insurance.life_insurance', newPolicies)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Policy Name</Label>
                              <Input
                                value={policy.policy_name}
                                onChange={(e) => {
                                  const newPolicies = [...data.insurance.life_insurance]
                                  newPolicies[index].policy_name = e.target.value
                                  updateNestedData('insurance.life_insurance', newPolicies)
                                }}
                                placeholder="e.g., HDFC Life Sanchay"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Provider</Label>
                              <Input
                                value={policy.provider}
                                onChange={(e) => {
                                  const newPolicies = [...data.insurance.life_insurance]
                                  newPolicies[index].provider = e.target.value
                                  updateNestedData('insurance.life_insurance', newPolicies)
                                }}
                                placeholder="e.g., HDFC Life"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Sum Assured (₹)</Label>
                              <Input
                                type="text"
                                value={policy.sum_assured ? formatIndianNumber(policy.sum_assured) : ''}
                                onChange={(e) => {
                                  const newPolicies = [...data.insurance.life_insurance]
                                  newPolicies[index].sum_assured = parseFormattedNumber(e.target.value)
                                  updateNestedData('insurance.life_insurance', newPolicies)
                                }}
                                placeholder="10,00,000"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Premium Amount (₹)</Label>
                              <Input
                                type="text"
                                value={policy.premium_amount ? formatIndianNumber(policy.premium_amount) : ''}
                                onChange={(e) => {
                                  const newPolicies = [...data.insurance.life_insurance]
                                  newPolicies[index].premium_amount = parseFormattedNumber(e.target.value)
                                  updateNestedData('insurance.life_insurance', newPolicies)
                                }}
                                placeholder="12,000"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Premium Frequency</Label>
                              <Select
                                value={policy.premium_frequency}
                                onValueChange={(value) => {
                                  const newPolicies = [...data.insurance.life_insurance]
                                  newPolicies[index].premium_frequency = value
                                  updateNestedData('insurance.life_insurance', newPolicies)
                                }}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="quarterly">Quarterly</SelectItem>
                                  <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Health Insurance */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Health Insurance</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPolicies = [...data.insurance.health_insurance, {
                          policy_name: '',
                          provider: '',
                          sum_assured: 0,
                          premium_amount: 0
                        }]
                        updateNestedData('insurance.health_insurance', newPolicies)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Policy
                    </Button>
                  </div>

                  {data.insurance.health_insurance.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No health insurance policies added yet.</p>
                      <p className="text-sm">Click "Add Policy" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.insurance.health_insurance.map((policy, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-medium">Policy {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newPolicies = data.insurance.health_insurance.filter((_, i) => i !== index)
                                updateNestedData('insurance.health_insurance', newPolicies)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Policy Name</Label>
                              <Input
                                value={policy.policy_name}
                                onChange={(e) => {
                                  const newPolicies = [...data.insurance.health_insurance]
                                  newPolicies[index].policy_name = e.target.value
                                  updateNestedData('insurance.health_insurance', newPolicies)
                                }}
                                placeholder="e.g., HDFC ERGO Health"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Provider</Label>
                              <Input
                                value={policy.provider}
                                onChange={(e) => {
                                  const newPolicies = [...data.insurance.health_insurance]
                                  newPolicies[index].provider = e.target.value
                                  updateNestedData('insurance.health_insurance', newPolicies)
                                }}
                                placeholder="e.g., HDFC ERGO"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Sum Assured (₹)</Label>
                              <Input
                                type="text"
                                value={policy.sum_assured ? formatIndianNumber(policy.sum_assured) : ''}
                                onChange={(e) => {
                                  const newPolicies = [...data.insurance.health_insurance]
                                  newPolicies[index].sum_assured = parseFormattedNumber(e.target.value)
                                  updateNestedData('insurance.health_insurance', newPolicies)
                                }}
                                placeholder="5,00,000"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Premium Amount (₹)</Label>
                              <Input
                                type="text"
                                value={policy.premium_amount ? formatIndianNumber(policy.premium_amount) : ''}
                                onChange={(e) => {
                                  const newPolicies = [...data.insurance.health_insurance]
                                  newPolicies[index].premium_amount = parseFormattedNumber(e.target.value)
                                  updateNestedData('insurance.health_insurance', newPolicies)
                                }}
                                placeholder="8,000"
                                className="h-9"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vehicle Insurance */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Vehicle Insurance</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPolicies = [...data.insurance.vehicle_insurance, {
                          policy_name: '',
                          provider: '',
                          vehicle_type: 'car',
                          premium_amount: 0
                        }]
                        updateNestedData('insurance.vehicle_insurance', newPolicies)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Policy
                    </Button>
                  </div>

                  {data.insurance.vehicle_insurance.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No vehicle insurance policies added yet.</p>
                      <p className="text-sm">Click "Add Policy" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.insurance.vehicle_insurance.map((policy, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-medium">Policy {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newPolicies = data.insurance.vehicle_insurance.filter((_, i) => i !== index)
                                updateNestedData('insurance.vehicle_insurance', newPolicies)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Policy Name</Label>
                              <Input
                                value={policy.policy_name}
                                onChange={(e) => {
                                  const newPolicies = [...data.insurance.vehicle_insurance]
                                  newPolicies[index].policy_name = e.target.value
                                  updateNestedData('insurance.vehicle_insurance', newPolicies)
                                }}
                                placeholder="e.g., Comprehensive Car Insurance"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Provider</Label>
                              <Input
                                value={policy.provider}
                                onChange={(e) => {
                                  const newPolicies = [...data.insurance.vehicle_insurance]
                                  newPolicies[index].provider = e.target.value
                                  updateNestedData('insurance.vehicle_insurance', newPolicies)
                                }}
                                placeholder="e.g., HDFC ERGO"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Vehicle Type</Label>
                              <Select
                                value={policy.vehicle_type}
                                onValueChange={(value) => {
                                  const newPolicies = [...data.insurance.vehicle_insurance]
                                  newPolicies[index].vehicle_type = value
                                  updateNestedData('insurance.vehicle_insurance', newPolicies)
                                }}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="car">Car</SelectItem>
                                  <SelectItem value="bike">Bike</SelectItem>
                                  <SelectItem value="scooter">Scooter</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Premium Amount (₹)</Label>
                              <Input
                                type="text"
                                value={policy.premium_amount ? formatIndianNumber(policy.premium_amount) : ''}
                                onChange={(e) => {
                                  const newPolicies = [...data.insurance.vehicle_insurance]
                                  newPolicies[index].premium_amount = parseFormattedNumber(e.target.value)
                                  updateNestedData('insurance.vehicle_insurance', newPolicies)
                                }}
                                placeholder="15,000"
                                className="h-9"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={prev}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex gap-2">
                {currentStep === ONBOARDING_STEPS.length - 1 ? (
                  <Button
                    onClick={save}
                    disabled={saving || !isStepValid(currentStep)}
                    className="flex items-center gap-2"
                  >
                    {saving ? "Saving..." : "Complete Setup"}
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={next}
                    disabled={!isStepValid(currentStep)}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Step Validation */}
            {!isStepValid(currentStep) && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Please fill in all required fields to continue.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
    </div>
  )
}
