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
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from "lucide-react"

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
    fields: ['full_name', 'email', 'phone', 'date_of_birth', 'gender', 'occupation'],
    required: true
  },
  {
    id: 'financial_profile',
    title: 'Financial Profile',
    description: 'Tell us about your financial situation',
    fields: ['monthly_income', 'annual_income', 'currency', 'risk_tolerance'],
    required: true
  },
  {
    id: 'banking_info',
    title: 'Banking Information',
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
    title: 'Credit & Debt',
    description: 'Information about your credit cards and loans',
    fields: ['credit_cards', 'loans'],
    required: false
  },
  {
    id: 'investments',
    title: 'Investments',
    description: 'Tell us about your investment portfolio',
    fields: ['investments'],
    required: false
  },
  {
    id: 'insurance',
    title: 'Insurance',
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
  annual_income: string
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
    annual_income: "",
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('🔑 Auth state changed in enhanced onboarding:', currentUser?.uid, currentUser?.email)
      setUser(currentUser)
      if (!currentUser) {
        console.log('❌ No authenticated user, redirecting to home')
        router.push("/")
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
        return !!(data.goals.primary && data.monthly_budgets.food > 0)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to A.I.D.A.</h1>
          <p className="text-gray-600">Let's set up your comprehensive financial profile</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />

          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {ONBOARDING_STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>
                <span className="text-xs mt-1 text-center max-w-20 truncate">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStepData.title}
              {currentStepData.required && <Badge variant="secondary">Required</Badge>}
            </CardTitle>
            <p className="text-gray-600">{currentStepData.description}</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Dynamic Form Fields */}
            {currentStepData.id === 'basic_info' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={data.full_name}
                    onChange={(e) => updateData('full_name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => updateData('email', e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={data.phone}
                    onChange={(e) => updateData('phone', e.target.value)}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={data.date_of_birth}
                    onChange={(e) => updateData('date_of_birth', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={data.gender} onValueChange={(value) => updateData('gender', value)}>
                    <SelectTrigger>
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
                <div>
                  <Label htmlFor="occupation">Occupation *</Label>
                  <Input
                    id="occupation"
                    value={data.occupation}
                    onChange={(e) => updateData('occupation', e.target.value)}
                    placeholder="Software Engineer, Doctor, etc."
                  />
                </div>
              </div>
            )}

            {currentStepData.id === 'financial_profile' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="monthly_income">Monthly Income (₹) *</Label>
                  <Input
                    id="monthly_income"
                    type="number"
                    value={data.monthly_income}
                    onChange={(e) => updateData('monthly_income', e.target.value)}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <Label htmlFor="annual_income">Annual Income (₹)</Label>
                  <Input
                    id="annual_income"
                    type="number"
                    value={data.annual_income}
                    onChange={(e) => updateData('annual_income', e.target.value)}
                    placeholder="600000"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency *</Label>
                  <Select value={data.currency} onValueChange={(value) => updateData('currency', value)}>
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
                  <Label htmlFor="risk_tolerance">Risk Tolerance: {data.risk_tolerance}/10</Label>
                  <Slider
                    value={[data.risk_tolerance]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(value) => updateData('risk_tolerance', value[0])}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Conservative</span>
                    <span>Aggressive</span>
                  </div>
                </div>
              </div>
            )}

            {currentStepData.id === 'goals_budget' && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="primary_goal">Primary Financial Goal *</Label>
                  <Textarea
                    id="primary_goal"
                    value={data.goals.primary}
                    onChange={(e) => updateNestedData('goals.primary', e.target.value)}
                    placeholder="e.g., Save for a house down payment, build emergency fund, etc."
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="target_amount">Target Amount (₹)</Label>
                    <Input
                      id="target_amount"
                      type="number"
                      value={data.goals.target_amount || ''}
                      onChange={(e) => updateNestedData('goals.target_amount', Number(e.target.value))}
                      placeholder="1000000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="target_date">Target Date</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={data.goals.target_date}
                      onChange={(e) => updateNestedData('goals.target_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthly_savings">Monthly Savings Target (₹)</Label>
                    <Input
                      id="monthly_savings"
                      type="number"
                      value={data.goals.monthly_savings_target || ''}
                      onChange={(e) => updateNestedData('goals.monthly_savings_target', Number(e.target.value))}
                      placeholder="15000"
                    />
                  </div>
                </div>

                <div>
                  <Label>Monthly Budget Allocation *</Label>
                  <p className="text-sm text-gray-600 mb-4">Allocate your monthly income across different categories</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(data.monthly_budgets).map(([category, amount]) => (
                      <div key={category}>
                        <Label htmlFor={category} className="capitalize">
                          {category.replace('_', ' ')} (₹)
                        </Label>
                        <Input
                          id={category}
                          type="number"
                          value={amount || ''}
                          onChange={(e) => updateNestedData(`monthly_budgets.${category}`, Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
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
    </div>
  )
}
