import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { headers } from "next/headers"

async function verifyFirebaseToken() {
  const headersList = headers()
  const authHeader = headersList.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const idToken = authHeader.substring(7) // Remove "Bearer " prefix

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    return decodedToken.uid
  } catch (error) {
    return null
  }
}

export async function GET(req: Request) {
  const userId = await verifyFirebaseToken()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const docRef = adminDb.collection("profiles").doc(userId)
    const docSnap = await docRef.get()
    const profile = docSnap.exists ? docSnap.data() : null
    return NextResponse.json({ profile })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await verifyFirebaseToken()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()

    const docRef = adminDb.collection("profiles").doc(userId)

    // Enhanced profile payload with all new fields
    const payload = {
      // Basic Info
      full_name: body.full_name || null,
      email: body.email || null,
      phone: body.phone || null,
      date_of_birth: body.date_of_birth ? new Date(body.date_of_birth) : null,
      gender: body.gender || null,
      occupation: body.occupation || null,
      employment_type: body.employment_type || null,

      // Financial Profile
      monthly_income: body.monthly_income ? Number(body.monthly_income) : null,
      currency: body.currency || "INR",
      risk_tolerance: body.risk_tolerance ? Number(body.risk_tolerance) : null,
      investment_horizon: body.investment_horizon || null,
      primary_bank: body.primary_bank || null,
      bank_accounts: Array.isArray(body.bank_accounts) ? body.bank_accounts : [],

      // Financial Goals
      goals: body.goals ? {
        primary: body.goals.primary || null,
        secondary: Array.isArray(body.goals.secondary) ? body.goals.secondary : [],
        target_amount: body.goals.target_amount ? Number(body.goals.target_amount) : null,
        target_date: body.goals.target_date ? new Date(body.goals.target_date) : null,
        monthly_savings_target: body.goals.monthly_savings_target ? Number(body.goals.monthly_savings_target) : null
      } : null,

      // Spending Categories & Budgets
      monthly_budgets: body.monthly_budgets ? {
        food: body.monthly_budgets.food ? Number(body.monthly_budgets.food) : 0,
        transportation: body.monthly_budgets.transportation ? Number(body.monthly_budgets.transportation) : 0,
        entertainment: body.monthly_budgets.entertainment ? Number(body.monthly_budgets.entertainment) : 0,
        shopping: body.monthly_budgets.shopping ? Number(body.monthly_budgets.shopping) : 0,
        utilities: body.monthly_budgets.utilities ? Number(body.monthly_budgets.utilities) : 0,
        rent: body.monthly_budgets.rent ? Number(body.monthly_budgets.rent) : 0,
        insurance: body.monthly_budgets.insurance ? Number(body.monthly_budgets.insurance) : 0,
        investments: body.monthly_budgets.investments ? Number(body.monthly_budgets.investments) : 0,
        miscellaneous: body.monthly_budgets.miscellaneous ? Number(body.monthly_budgets.miscellaneous) : 0
      } : {
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

      // Credit & Debt Information
      credit_cards: Array.isArray(body.credit_cards) ? body.credit_cards.map((card: any) => ({
        card_name: card.card_name || null,
        bank_name: card.bank_name || null,
        credit_limit: card.credit_limit ? Number(card.credit_limit) : null,
        outstanding_balance: card.outstanding_balance ? Number(card.outstanding_balance) : null,
        due_date: card.due_date ? Number(card.due_date) : null,
        minimum_due: card.minimum_due ? Number(card.minimum_due) : null
      })) : [],

      loans: Array.isArray(body.loans) ? body.loans.map((loan: any) => ({
        loan_type: loan.loan_type || null,
        lender: loan.lender || null,
        principal_amount: loan.principal_amount ? Number(loan.principal_amount) : null,
        outstanding_balance: loan.outstanding_balance ? Number(loan.outstanding_balance) : null,
        monthly_emi: loan.monthly_emi ? Number(loan.monthly_emi) : null,
        interest_rate: loan.interest_rate ? Number(loan.interest_rate) : null,
        tenure_remaining: loan.tenure_remaining ? Number(loan.tenure_remaining) : null
      })) : [],

      // Investment Portfolio
      investments: body.investments ? {
        mutual_funds: Array.isArray(body.investments.mutual_funds) ? body.investments.mutual_funds.map((fund: any) => ({
          fund_name: fund.fund_name || null,
          amc: fund.amc || null,
          investment_amount: fund.investment_amount ? Number(fund.investment_amount) : null,
          current_value: fund.current_value ? Number(fund.current_value) : null,
          sip_amount: fund.sip_amount ? Number(fund.sip_amount) : null
        })) : [],
        stocks: Array.isArray(body.investments.stocks) ? body.investments.stocks.map((stock: any) => ({
          company: stock.company || null,
          quantity: stock.quantity ? Number(stock.quantity) : null,
          average_price: stock.average_price ? Number(stock.average_price) : null,
          current_price: stock.current_price ? Number(stock.current_price) : null
        })) : [],
        fixed_deposits: Array.isArray(body.investments.fixed_deposits) ? body.investments.fixed_deposits.map((fd: any) => ({
          bank: fd.bank || null,
          principal: fd.principal ? Number(fd.principal) : null,
          interest_rate: fd.interest_rate ? Number(fd.interest_rate) : null,
          maturity_date: fd.maturity_date ? new Date(fd.maturity_date) : null
        })) : []
      } : {
        mutual_funds: [],
        stocks: [],
        fixed_deposits: []
      },

      // Insurance
      insurance: body.insurance ? {
        life_insurance: Array.isArray(body.insurance.life_insurance) ? body.insurance.life_insurance.map((policy: any) => ({
          policy_name: policy.policy_name || null,
          provider: policy.provider || null,
          sum_assured: policy.sum_assured ? Number(policy.sum_assured) : null,
          premium_amount: policy.premium_amount ? Number(policy.premium_amount) : null,
          premium_frequency: policy.premium_frequency || null
        })) : [],
        health_insurance: Array.isArray(body.insurance.health_insurance) ? body.insurance.health_insurance.map((policy: any) => ({
          policy_name: policy.policy_name || null,
          provider: policy.provider || null,
          sum_assured: policy.sum_assured ? Number(policy.sum_assured) : null,
          premium_amount: policy.premium_amount ? Number(policy.premium_amount) : null
        })) : [],
        vehicle_insurance: Array.isArray(body.insurance.vehicle_insurance) ? body.insurance.vehicle_insurance.map((policy: any) => ({
          policy_name: policy.policy_name || null,
          provider: policy.provider || null,
          vehicle_type: policy.vehicle_type || null,
          premium_amount: policy.premium_amount ? Number(policy.premium_amount) : null
        })) : []
      } : {
        life_insurance: [],
        health_insurance: [],
        vehicle_insurance: []
      },

      // Metadata
      onboarding_complete: !!body.onboarding_complete,
      onboarding_step: body.onboarding_step ? Number(body.onboarding_step) : 0,
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date()
    }

    await docRef.set(payload, { merge: true })
    return NextResponse.json({ profile: payload })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
  }
}

// Test endpoint to verify Firebase Admin SDK
export async function HEAD(req: Request) {
  try {
    // Try to get a test document
    const testRef = adminDb.collection("test").doc("test-doc")
    await testRef.set({ test: true, timestamp: new Date() }, { merge: true })

    return new Response(null, { status: 200 })
  } catch (error) {
    return new Response(null, { status: 500 })
  }
}
