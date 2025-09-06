
export interface Profile {
  full_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: Date;
  gender?: string;
  occupation?: string;
  employment_type?: string;
  monthly_income?: number;
  currency?: string;
  risk_tolerance?: number;
  investment_horizon?: string;
  primary_bank?: string;
  bank_accounts?: BankAccount[];
  goals?: FinancialGoals;
  monthly_budgets?: MonthlyBudgets;
  credit_cards?: CreditCard[];
  loans?: Loan[];
  investments?: InvestmentPortfolio;
  insurance?: Insurance;
  onboarding_complete?: boolean;
  onboarding_step?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BankAccount {
  account_number: string;
  bank_name: string;
  account_type: string;
  ifsc_code: string;
}

export interface FinancialGoals {
  primary?: string;
  secondary?: string[];
  target_amount?: number;
  target_date?: Date;
  monthly_savings_target?: number;
}

export interface MonthlyBudgets {
  food: number;
  transportation: number;
  entertainment: number;
  shopping: number;
  utilities: number;
  rent: number;
  insurance: number;
  investments: number;
  miscellaneous: number;
}

export interface CreditCard {
  card_name?: string;
  bank_name?: string;
  credit_limit?: number;
  outstanding_balance?: number;
  due_date?: number;
  minimum_due?: number;
}

export interface Loan {
  loan_type?: string;
  lender?: string;
  principal_amount?: number;
  outstanding_balance?: number;
  monthly_emi?: number;
  interest_rate?: number;
  tenure_remaining?: number;
}

export interface InvestmentPortfolio {
  mutual_funds?: MutualFund[];
  stocks?: Stock[];
  fixed_deposits?: FixedDeposit[];
}

export interface MutualFund {
  fund_name?: string;
  amc?: string;
  investment_amount?: number;
  current_value?: number;
  sip_amount?: number;
}

export interface Stock {
  company?: string;
  quantity?: number;
  average_price?: number;
  current_price?: number;
}

export interface FixedDeposit {
  bank?: string;
  principal?: number;
  interest_rate?: number;
  maturity_date?: Date;
}

export interface Insurance {
  life_insurance?: LifeInsurance[];
  health_insurance?: HealthInsurance[];
  vehicle_insurance?: VehicleInsurance[];
}

export interface LifeInsurance {
  policy_name?: string;
  provider?: string;
  sum_assured?: number;
  premium_amount?: number;
  premium_frequency?: string;
}

export interface HealthInsurance {
  policy_name?: string;
  provider?: string;
  sum_assured?: number;
  premium_amount?: number;
}

export interface VehicleInsurance {
  policy_name?: string;
  provider?: string;
  vehicle_type?: string;
  premium_amount?: number;
}
