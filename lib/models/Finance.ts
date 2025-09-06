
export interface Finance {
  id: string;
  userId: string;
  transaction_id: string;
  type: 'income' | 'expense' | 'transfer' | 'investment';
  amount: number;
  currency: string;
  category: string;
  subcategory: string;
  description: string;
  merchant?: string;
  date: Date;
  month: string;
  year: string;
  ai_generated: boolean;
  confidence_score: number;
  source_message?: string;
  ai_reasoning?: string;
  payment_method?: string;
  tags?: string[];
  location?: string;
  notes?: string;
  investment_type?: string;
  units?: number;
  price_per_unit?: number;
  current_value?: number;
  recurring: boolean;
  recurring_frequency?: string;
  createdAt: Date;
  updatedAt: Date;
  created_by: 'user' | 'ai';
}
