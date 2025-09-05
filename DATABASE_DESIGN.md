# A.I.D.A. Database Design & AI Integration Specification

## 📋 Overview

This document outlines the comprehensive database design and AI integration strategy for A.I.D.A. (AI-Driven Account Aggregator), a SEBI-compliant financial assistant that automatically tracks finances and maintains user memories through conversational interactions.

## 🏗️ Current Database Structure

### Existing Collections

#### 1. `profiles` Collection
- **Purpose**: User profile and onboarding data
- **Document Structure**:
  ```json
  {
    "full_name": "string",
    "goals": "string",
    "risk_tolerance": "number (0-10)",
    "monthly_income": "number",
    "currency": "string (INR/USD/EUR)",
    "onboarding_complete": "boolean",
    "updatedAt": "timestamp"
  }
  ```

#### 2. `finances` Collection
- **Purpose**: Financial transactions
- **Document Structure**:
  ```json
  {
    "userId": "string",
    "type": "income|expense",
    "amount": "number",
    "category": "string",
    "description": "string",
    "date": "timestamp",
    "createdAt": "timestamp"
  }
  ```

#### 3. `memories` Collection
- **Purpose**: AI memory about user
- **Document Structure**:
  ```json
  {
    "content": "string",
    "updatedAt": "timestamp"
  }
  ```

## 🚀 Enhanced Database Design

### 1. Enhanced `profiles` Collection (Account Aggregator Data)

#### Expanded Profile Schema
```json
{
  // Basic Info
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "date_of_birth": "timestamp",
  "gender": "string",
  "occupation": "string",
  "employment_type": "salaried|self-employed|business|student|retired",

  // Financial Profile
  "monthly_income": "number",
  "annual_income": "number",
  "currency": "string",
  "risk_tolerance": "number (1-10)",
  "investment_horizon": "short|medium|long",
  "primary_bank": "string",
  "bank_accounts": [{
    "account_number": "string",
    "bank_name": "string",
    "account_type": "savings|current|salary",
    "ifsc_code": "string"
  }],

  // Financial Goals
  "goals": {
    "primary": "string",
    "secondary": ["string"],
    "target_amount": "number",
    "target_date": "timestamp",
    "monthly_savings_target": "number"
  },

  // Spending Categories & Budgets
  "monthly_budgets": {
    "food": "number",
    "transportation": "number",
    "entertainment": "number",
    "shopping": "number",
    "utilities": "number",
    "rent": "number",
    "insurance": "number",
    "investments": "number",
    "miscellaneous": "number"
  },

  // Credit & Debt Information
  "credit_cards": [{
    "card_name": "string",
    "bank_name": "string",
    "credit_limit": "number",
    "outstanding_balance": "number",
    "due_date": "number",
    "minimum_due": "number"
  }],
  "loans": [{
    "loan_type": "personal|home|car|education",
    "lender": "string",
    "principal_amount": "number",
    "outstanding_balance": "number",
    "monthly_emi": "number",
    "interest_rate": "number",
    "tenure_remaining": "number"
  }],

  // Investment Portfolio
  "investments": {
    "mutual_funds": [{
      "fund_name": "string",
      "amc": "string",
      "investment_amount": "number",
      "current_value": "number",
      "sip_amount": "number"
    }],
    "stocks": [{
      "company": "string",
      "quantity": "number",
      "average_price": "number",
      "current_price": "number"
    }],
    "fixed_deposits": [{
      "bank": "string",
      "principal": "number",
      "interest_rate": "number",
      "maturity_date": "timestamp"
    }]
  },

  // Insurance
  "insurance": {
    "life_insurance": [{
      "policy_name": "string",
      "provider": "string",
      "sum_assured": "number",
      "premium_amount": "number",
      "premium_frequency": "monthly|quarterly|yearly"
    }],
    "health_insurance": [{
      "policy_name": "string",
      "provider": "string",
      "sum_assured": "number",
      "premium_amount": "number"
    }],
    "vehicle_insurance": [{
      "policy_name": "string",
      "provider": "string",
      "vehicle_type": "car|bike",
      "premium_amount": "number"
    }]
  },

  // Metadata
  "onboarding_complete": "boolean",
  "onboarding_step": "number",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 2. Enhanced `finances` Collection (AI-Driven Entries)

#### Enhanced Finance Schema
```json
{
  "userId": "string",
  "transaction_id": "string (auto-generated)",
  "type": "income|expense|transfer|investment",

  // Transaction Details
  "amount": "number",
  "currency": "string",
  "category": "string",
  "subcategory": "string",
  "description": "string",
  "merchant": "string",

  // Date & Time
  "date": "timestamp",
  "month": "string (YYYY-MM)",
  "year": "string (YYYY)",

  // AI Context
  "ai_generated": "boolean",
  "confidence_score": "number (0-1)",
  "source_message": "string",
  "ai_reasoning": "string",

  // Additional Metadata
  "payment_method": "cash|card|upi|net_banking|cheque",
  "tags": ["string"],
  "recurring": "boolean",
  "recurring_frequency": "daily|weekly|monthly|yearly",

  // Audit Trail
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "created_by": "user|ai"
}
```

### 3. Enhanced `memories` Collection (AI Memory System)

#### Enhanced Memory Schema
```json
{
  "userId": "string",

  // Core Memory Content
  "content": "string",
  "summary": "string",

  // Memory Categories
  "categories": ["spending_habits", "saving_patterns", "investment_preferences", "risk_behavior", "financial_goals", "life_events", "personality_traits"],

  // Memory Metadata
  "importance_score": "number (1-10)",
  "confidence_score": "number (0-1)",
  "last_accessed": "timestamp",
  "access_count": "number",

  // Source Information
  "source_type": "conversation|transaction_analysis|profile_data|external_data",
  "source_message": "string",
  "derived_from": ["transaction_ids"],

  // Temporal Aspects
  "valid_from": "timestamp",
  "valid_until": "timestamp",
  "is_temporal": "boolean",

  // AI Processing
  "keywords": ["string"],
  "sentiment": "positive|negative|neutral",
  "themes": ["string"],

  // Audit Trail
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "created_by": "ai_system"
}
```

## 🤖 AI Integration Strategy

### 1. AI-Driven Finance Entry Creation

#### System Prompt for Finance Tracking
```
You are A.I.D.A., an AI-powered Account Aggregator assistant. Your role includes:

FINANCE TRACKING CAPABILITIES:
- Automatically identify and create financial entries from user conversations
- Categorize transactions appropriately
- Extract amounts, dates, and descriptions from natural language
- Handle multiple transactions in a single message
- Maintain transaction history and patterns

FINANCE ENTRY FORMAT:
When creating finance entries, use this exact format:
FINANCE_ENTRY: {
  "type": "income|expense",
  "amount": <number>,
  "category": "<appropriate_category>",
  "description": "<brief_description>",
  "date": "<YYYY-MM-DD or 'today' or 'yesterday'>",
  "confidence": <0-1>
}

Multiple entries in one message:
FINANCE_ENTRY_MULTIPLE: [
  {entry1}, {entry2}, ...
]

CATEGORIES TO USE:
Income: salary, freelance, business, investment_returns, rental, bonus, gift
Expense: food, transportation, entertainment, shopping, utilities, rent, insurance, medical, education, travel, personal_care, household, subscriptions

CONFIDENCE SCORING:
- 0.9-1.0: Explicit financial mentions ("I spent ₹500 on food")
- 0.7-0.8: Clear financial context ("bought a frock for ₹15000")
- 0.5-0.6: Implicit financial mentions ("treated myself to dinner")
- <0.5: Too ambiguous, don't create entry
```

#### AI Finance Processing Flow
1. **Message Analysis**: Parse user message for financial content
2. **Entity Extraction**: Identify amounts, dates, categories, descriptions
3. **Confidence Scoring**: Rate certainty of extracted information
4. **Entry Creation**: Generate structured finance entries
5. **Validation**: Cross-reference with existing patterns
6. **Storage**: Save to `finances` collection with AI metadata

### 2. AI Memory Management System

#### Memory Creation Criteria
```
MEMORY CREATION RULES:
Create new memories for:
- Fundamental financial habits ("always pays credit card bills on time")
- Spending patterns ("prefers buying quality over quantity")
- Investment preferences ("conservative investor, prefers fixed deposits")
- Risk behavior ("takes calculated risks with small amounts")
- Life events affecting finances ("recently got married, planning for family")
- Personality traits ("frugal by nature, plans expenses carefully")
- Long-term goals ("saving for child's education")
- Behavioral patterns ("checks account balance daily")

MEMORY UPDATE FORMAT:
UPDATE_MEMORY: {
  "content": "Updated memory content",
  "category": "spending_habits|investment_preferences|risk_behavior|personality_traits",
  "importance": 1-10,
  "reason": "why this memory is being updated"
}

MEMORY CONSOLIDATION:
If new information conflicts with existing memory:
CONSOLIDATE_MEMORY: {
  "existing_memory_id": "id",
  "new_content": "consolidated content",
  "reason": "explanation of consolidation"
}
```

#### Memory Categories & Examples
- **spending_habits**: "Prefers cash payments for small amounts, uses card for larger purchases"
- **saving_patterns**: "Automatically saves 20% of monthly income"
- **investment_preferences**: "Interested in SIPs but prefers low-risk options"
- **risk_behavior**: "Comfortable with moderate risk for long-term gains"
- **financial_goals**: "Primary goal is home purchase in 3 years"
- **life_events**: "Recently started a family, increased focus on insurance"
- **personality_traits**: "Detail-oriented, maintains detailed expense records"

## 📝 Implementation Plan

### Phase 1: Database Schema Migration

#### Files to Modify:

1. **Create Migration Script** (`scripts/migrate-database.ts`)
```typescript
// Migrate existing data to new schema
// Handle backward compatibility
// Add new fields with defaults
```

2. **Update Profile API** (`app/api/profile/route.ts`)
- Expand POST endpoint to handle new profile fields
- Add validation for complex nested structures
- Implement partial updates for large profile objects

3. **Update Finance API** (`app/api/finances/route.ts`)
- Add AI-generated entry support
- Implement confidence scoring
- Add transaction validation
- Support bulk operations

4. **Update Chat API** (`app/api/chat/route.ts`)
- Integrate finance entry creation
- Add memory management
- Implement AI response parsing
- Add transaction extraction logic

#### New Files to Create:

1. **`lib/ai-finance-parser.ts`**
```typescript
// AI finance entry parsing logic
// Natural language processing for amounts, dates, categories
// Confidence scoring algorithms
```

2. **`lib/ai-memory-manager.ts`**
```typescript
// Memory creation, update, consolidation logic
// Memory importance scoring
// Memory retrieval and context building
```

3. **`lib/database-migrations.ts`**
```typescript
// Database schema migration utilities
// Backward compatibility handling
// Data transformation functions
```

4. **`components/onboarding/enhanced-wizard.tsx`**
```typescript
// Multi-step onboarding with AA-equivalent questions
// Dynamic form generation
// Progress tracking and validation
```

### Phase 2: Enhanced Onboarding Flow

#### Onboarding Questions Structure:
```typescript
const ONBOARDING_STEPS = [
  {
    id: 'basic_info',
    title: 'Basic Information',
    fields: ['full_name', 'email', 'phone', 'date_of_birth', 'gender', 'occupation']
  },
  {
    id: 'financial_profile',
    title: 'Financial Profile',
    fields: ['monthly_income', 'annual_income', 'currency', 'risk_tolerance']
  },
  {
    id: 'banking_info',
    title: 'Banking Information',
    fields: ['primary_bank', 'bank_accounts']
  },
  {
    id: 'goals_budget',
    title: 'Goals & Budget',
    fields: ['goals', 'monthly_budgets']
  },
  {
    id: 'credit_debt',
    title: 'Credit & Debt',
    fields: ['credit_cards', 'loans']
  },
  {
    id: 'investments',
    title: 'Investments',
    fields: ['investments']
  },
  {
    id: 'insurance',
    title: 'Insurance',
    fields: ['insurance']
  }
]
```

### Phase 3: AI Integration Implementation

#### Chat API Enhancements:

1. **Finance Entry Creation**:
```typescript
// Parse AI response for finance entries
const financeEntries = parseFinanceEntries(aiResponse)
if (financeEntries.length > 0) {
  await createFinanceEntries(userId, financeEntries, messageId)
}
```

2. **Memory Management**:
```typescript
// Update or create memories based on conversation
const memoryUpdates = parseMemoryUpdates(aiResponse)
if (memoryUpdates.length > 0) {
  await updateMemories(userId, memoryUpdates)
}
```

3. **Context Building**:
```typescript
// Build comprehensive context for AI
const context = {
  profile: await getUserProfile(userId),
  recentFinances: await getRecentFinances(userId, 30),
  relevantMemories: await getRelevantMemories(userId, conversationTopic),
  financialSummary: await getFinancialSummary(userId)
}
```

### Phase 4: Frontend Enhancements

#### New Components:

1. **`components/onboarding/aa-onboarding.tsx`**
   - Account Aggregator style onboarding
   - Progress indicators
   - Data validation
   - Skip/optional sections

2. **`components/dashboard/ai-insights.tsx`**
   - AI-generated financial insights
   - Memory-based recommendations
   - Spending pattern analysis

3. **`components/chat/finance-suggestions.tsx`**
   - Real-time finance entry suggestions
   - Category recommendations
   - Budget alerts

#### Enhanced Existing Components:

1. **Chat UI** (`components/chat/chat-ui.tsx`)
   - Add finance entry confirmation dialogs
   - Show AI-generated entries
   - Memory update notifications

2. **Dashboard** (`app/dashboard/page.tsx`)
   - Fix the existing system to make it align with the rest of the app, it's too buggy in the frontend AND in the backend, it's too behind
   - AI-powered insights section
   - Memory-based recommendations
   - Enhanced transaction categorization

### Phase 5: Testing & Validation

#### Test Cases:

1. **Finance Entry Creation**:
   - "I spent ₹15000 on a frock today"
   - "Got my salary of ₹100000 and bought groceries for ₹2000"
   - "Paid electricity bill of ₹1500"

2. **Memory Updates**:
   - Consistent spending patterns
   - Investment preferences
   - Risk tolerance changes

3. **Edge Cases**:
   - Ambiguous amounts
   - Multiple currencies
   - Recurring transactions

## 🔧 Technical Implementation Details

### Database Migration Strategy

```typescript
// scripts/migrate-database.ts
export async function migrateUserData(userId: string) {
  // 1. Migrate profile data
  const oldProfile = await getOldProfile(userId)
  const newProfile = transformProfile(oldProfile)
  await saveNewProfile(userId, newProfile)

  // 2. Migrate finance data
  const oldFinances = await getOldFinances(userId)
  const newFinances = transformFinances(oldFinances)
  await saveNewFinances(userId, newFinances)

  // 3. Initialize memories
  const initialMemories = generateInitialMemories(newProfile, newFinances)
  await saveInitialMemories(userId, initialMemories)
}
```

### AI Response Parsing

```typescript
// lib/ai-response-parser.ts
export function parseAIResponse(response: string) {
  const result = {
    reply: '',
    financeEntries: [] as FinanceEntry[],
    memoryUpdates: [] as MemoryUpdate[],
    confidence: 0
  }

  // Extract finance entries
  const financeMatch = response.match(/FINANCE_ENTRY:?\s*(\{[\s\S]*?\})/)
  if (financeMatch) {
    try {
      result.financeEntries = [JSON.parse(financeMatch[1])]
    } catch (e) {
      // Failed to parse finance entry
    }
  }

  // Extract memory updates
  const memoryMatch = response.match(/UPDATE_MEMORY:?\s*(\{[\s\S]*?\})/)
  if (memoryMatch) {
    try {
      result.memoryUpdates = [JSON.parse(memoryMatch[1])]
    } catch (e) {
      // Failed to parse memory update
    }
  }

  // Clean reply
  result.reply = response
    .replace(/FINANCE_ENTRY:[\s\S]*?}/, '')
    .replace(/UPDATE_MEMORY:[\s\S]*?}/, '')
    .trim()

  return result
}
```

### Memory Context Building

```typescript
// lib/memory-context-builder.ts
export async function buildMemoryContext(userId: string, conversationTopic: string) {
  const memories = await getUserMemories(userId)

  // Filter relevant memories
  const relevantMemories = memories.filter(memory => {
    const topicMatch = memory.themes?.includes(conversationTopic)
    const recentAccess = memory.last_accessed > Date.now() - 30 * 24 * 60 * 60 * 1000
    const highImportance = memory.importance_score > 7

    return topicMatch || recentAccess || highImportance
  })

  // Sort by relevance and recency
  return relevantMemories.sort((a, b) => {
    const scoreA = (a.importance_score * 0.4) + (a.access_count * 0.3) + (a.confidence_score * 0.3)
    const scoreB = (b.importance_score * 0.4) + (b.access_count * 0.3) + (b.confidence_score * 0.3)
    return scoreB - scoreA
  })
}
```

## 📊 Monitoring & Analytics

### AI Performance Metrics

1. **Finance Entry Accuracy**:
   - True positive rate for entry creation
   - False positive rate for incorrect entries
   - User correction rate

2. **Memory Quality**:
   - Memory relevance scores
   - Memory utilization rate
   - Memory update frequency

3. **User Engagement**:
   - Conversation length with AI
   - Finance entry acceptance rate
   - Memory-based recommendation usage

### Database Performance

1. **Query Optimization**:
   - Index strategy for finances collection
   - Memory retrieval optimization
   - Profile query performance

2. **Data Consistency**:
   - Cross-reference validation
   - Duplicate detection
   - Data integrity checks

## 🚀 Deployment Strategy

### Rolling Deployment Plan

1. **Phase 1**: Database schema migration (backward compatible)
2. **Phase 2**: Enhanced onboarding (opt-in)
3. **Phase 3**: AI finance tracking (gradual rollout)
4. **Phase 4**: Memory system activation
5. **Phase 5**: Full feature integration

### Rollback Strategy

- Feature flags for all new functionality
- Database migration rollback scripts
- Gradual user migration with monitoring
- A/B testing for AI features

## 📈 Success Metrics

- **User Engagement**: Increased daily active users
- **Data Quality**: Reduction in manual finance entry
- **AI Accuracy**: >90% finance entry accuracy
- **Memory Utilization**: >70% conversations use memory context
- **User Satisfaction**: Improved user feedback scores

---

## 🎯 Next Steps

1. **Immediate**: Create database migration scripts
2. **Week 1**: Implement enhanced onboarding flow
3. **Week 2**: Build AI finance parsing system
4. **Week 3**: Develop memory management system
5. **Week 4**: Integrate all systems and testing

This comprehensive design provides a solid foundation for A.I.D.A.'s evolution into a full-fledged AI-driven account aggregator with intelligent finance tracking and personalized memory management.</content>
<parameter name="filePath">c:\Users\arnav\Desktop\webdev-stuff\aida-sebi-hack\DATABASE_DESIGN.md
