
export interface Memory {
  id: string;
  userId: string;
  content: string;
  summary?: string;
  categories: string[];
  importance_score: number;
  confidence_score: number;
  last_accessed: Date;
  access_count: number;
  source_type: 'conversation' | 'transaction_analysis' | 'profile_data' | 'external_data';
  source_message?: string;
  derived_from?: string[];
  valid_from?: Date;
  valid_until?: Date;
  is_temporal: boolean;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  themes: string[];
  createdAt: Date;
  updatedAt: Date;
  created_by: 'ai_system';
}
