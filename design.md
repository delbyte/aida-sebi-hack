# A.I.D.A. System Design Document

## Overview
A.I.D.A. (AI-Driven Financial Advisor) is a web-based platform for hyper-personalized financial mentoring. Users interact with an AI agent that provides SEBI-compliant advice, manages a dynamic "memory" of user data, and integrates with a dashboard for finance management. The system emphasizes personalization, AI-driven data updates, and seamless querying for both AI and user interfaces.

**Key Requirements:**
- Hyper-personalized AI with editable, unstructured memory per user.
- AI model: Gemini-2.5-flash (Google) instead of OpenAI.
- Dashboard for finance management, synced with AI memory.
- Deployment-ready with real auth (Google/email) and persistent, queryable data.
- Data must be non-ephemeral, sequential (e.g., day-by-day finances), and AI-updatable.

## Architecture
- **Frontend**: Next.js with shadcn/ui for components. Handles UI, localStorage for client-side data, and API calls.
- **Backend**: Next.js API routes for auth, data persistence, and AI integration. For deployment, integrate with MongoDB Atlas (free tier) for multi-user support.
- **AI Integration**: Gemini-2.5-flash via @google/generative-ai SDK. AI accesses/updates user memory before responding.
- **Data Storage**:
  - **Client-Side (localStorage/IndexedDB)**: For offline support. Stores unstructured memory as JSON/text per user.
  - **Server-Side**: MongoDB for persistence and querying. Syncs with client-side memory.
- **Auth**: Google OAuth and email/password via NextAuth.js.
- **Deployment**: Vercel/Netlify for frontend, with MongoDB Atlas for backend.

### Data Flow
1. User signs in → Auth token stored.
2. Onboarding: User inputs data → Stored in memory (unstructured) and database.
3. Chat: AI fetches memory, generates response, and updates memory if needed (e.g., new insights).
4. Dashboard: Queries database for structured data (e.g., expenses by date), displays visualizations.
5. Sync: Client-side memory syncs with server on changes.

## Data Model
- **User Profile**: Structured (name, goals, risk tolerance, income, currency).
- **AI Memory**: Unstructured text/JSON per user. Includes conversation history, financial notes, and AI-generated updates. Example: `{"user_id": "123", "memory": "User has 50k income, invested in stocks, recent expense: groceries 5k on 2025-09-03"}`.
- **Financial Data**: Sequential, queryable (e.g., transactions, investments). Stored in database with timestamps for day-by-day tracking.
- **Sync Mechanism**: Use timestamps/versions to merge client-server data.

## AI Integration (Gemini-2.5-flash)
- **SDK**: @google/generative-ai.
- **Usage**: Before responding, AI fetches user memory. After response, AI can suggest updates (e.g., "Update memory: User mentioned new goal").
- **Syntax Example**:
  ```javascript
  import { GoogleGenerativeAI } from "@google/generative-ai";
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }); // Use gemini-2.5-flash when available
  const result = await model.generateContent(prompt);
  ```
- **Memory Handling**: Include memory in system prompt. Allow AI to output structured updates (e.g., JSON) for storage.

## Dashboard
- **Features**: Visualize finances (charts for expenses/income), add/edit transactions, query by date/category.
- **Data Source**: Queryable database (e.g., via API). Syncs with AI memory for personalized insights.
- **Components**: Use shadcn/ui (e.g., charts from recharts). Add a new `/dashboard` page.
- **Challenge**: Balance unstructured AI memory with structured dashboard data. Use AI to generate structured summaries for dashboard.

## Implementation Steps
1. **Set up Auth and DB**:
   - Install NextAuth.js, MongoDB, Mongoose.
   - Configure Google OAuth in NextAuth.js.
   - Set up MongoDB Atlas connection.
   - Create Mongoose models for User, Profile, Memory, Finance.

2. **Update AI to Gemini**:
   - Install @google/generative-ai.
   - Replace OpenAI code in /api/chat with Gemini syntax.
   - Add memory fetching/updating logic from DB.

3. **Implement AI Memory System**:
   - Store memory in MongoDB per user.
   - AI fetches memory from DB, includes in prompt, parses updates, and saves back.

4. **Add Dashboard**:
   - Create /app/dashboard/page.tsx with charts and forms.
   - Add API routes for querying finances (e.g., /api/finances).
   - Sync dashboard data with AI memory (e.g., AI can suggest categorizing expenses).

5. **Auth and Persistence**:
   - Integrate NextAuth.js for Google sign-in.
   - Update API routes to use auth and DB.
   - Ensure multi-user support from the start.

6. **Testing and Deployment**:
   - Test AI memory updates and dashboard queries.
   - Deploy to Vercel, configure env vars for Gemini, MongoDB, Google OAuth.

## Challenges and Solutions
- **Unstructured Memory in localStorage**: Use JSON for structure, but allow AI to edit as text. For querying, parse with AI or add simple indexing.
- **Per-User in localStorage**: Prefix keys with user ID (e.g., `memory_123`).
- **AI Updating Storage**: AI outputs updates in a specific format (e.g., "UPDATE_MEMORY: new data"), parse and apply.
- **Queryable Dashboard**: Use a hybrid: Structured DB for dashboard, unstructured for AI. Sync via API.

This design ensures hyper-personalization, AI autonomy, and usability. Ready to implement?</content>
<parameter name="filePath">c:\Users\arnav\Desktop\webdev-stuff\aida-sebi-hack\design.md
