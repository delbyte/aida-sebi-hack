import { adminDb } from "@/lib/firebase-admin"

export interface MigrationResult {
  success: boolean
  migratedUsers: string[]
  errors: string[]
  timestamp: Date
}

export interface OldProfile {
  full_name?: string
  goals?: string
  risk_tolerance?: number
  monthly_income?: number
  currency?: string
  onboarding_complete?: boolean
  updatedAt?: Date
}

export interface NewProfile {
  // Basic Info
  full_name?: string
  email?: string
  phone?: string
  date_of_birth?: Date
  gender?: string
  occupation?: string
  employment_type?: string

  // Financial Profile
  monthly_income?: number
  annual_income?: number
  currency?: string
  risk_tolerance?: number
  investment_horizon?: string
  primary_bank?: string
  bank_accounts?: any[]

  // Financial Goals
  goals?: {
    primary?: string
    secondary?: string[]
    target_amount?: number
    target_date?: Date
    monthly_savings_target?: number
  }

  // Spending Categories & Budgets
  monthly_budgets?: {
    food?: number
    transportation?: number
    entertainment?: number
    shopping?: number
    utilities?: number
    rent?: number
    insurance?: number
    investments?: number
    miscellaneous?: number
  }

  // Metadata
  onboarding_complete?: boolean
  onboarding_step?: number
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Migrate a single user's profile from old schema to new schema
 */
export async function migrateUserProfile(userId: string): Promise<boolean> {
  try {
    console.log(`🔄 Migrating profile for user: ${userId}`)

    // Get existing profile
    const profileRef = adminDb.collection("profiles").doc(userId)
    const profileSnap = await profileRef.get()

    if (!profileSnap.exists) {
      console.log(`⚠️ No profile found for user: ${userId}`)
      return false
    }

    const oldProfile = profileSnap.data() as OldProfile
    console.log('📄 Old profile data:', oldProfile)

    // Transform to new schema
    const newProfile: NewProfile = {
      // Migrate existing basic fields
      full_name: oldProfile.full_name,
      goals: oldProfile.goals ? {
        primary: oldProfile.goals,
        secondary: [],
        target_amount: 0,
        monthly_savings_target: 0
      } : undefined,
      monthly_income: oldProfile.monthly_income,
      currency: oldProfile.currency || "INR",
      risk_tolerance: oldProfile.risk_tolerance,
      investment_horizon: oldProfile.risk_tolerance && oldProfile.risk_tolerance <= 3 ? "short" :
                         oldProfile.risk_tolerance && oldProfile.risk_tolerance <= 7 ? "medium" : "long",

      // Set defaults for new fields
      bank_accounts: [],
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

      // Metadata
      onboarding_complete: oldProfile.onboarding_complete || false,
      onboarding_step: oldProfile.onboarding_complete ? 5 : 0,
      createdAt: oldProfile.updatedAt || new Date(),
      updatedAt: new Date()
    }

    // Save migrated profile
    await profileRef.set(newProfile, { merge: true })
    console.log(`✅ Successfully migrated profile for user: ${userId}`)

    return true
  } catch (error) {
    console.error(`❌ Failed to migrate profile for user: ${userId}`, error)
    return false
  }
}

/**
 * Migrate all user profiles in the database
 */
export async function migrateAllProfiles(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedUsers: [],
    errors: [],
    timestamp: new Date()
  }

  try {
    console.log('🚀 Starting profile migration for all users...')

    // Get all profile documents
    const profilesRef = adminDb.collection("profiles")
    const snapshot = await profilesRef.get()

    if (snapshot.empty) {
      console.log('⚠️ No profiles found to migrate')
      result.success = true
      return result
    }

    console.log(`📊 Found ${snapshot.size} profiles to migrate`)

    // Migrate each profile
    for (const doc of snapshot.docs) {
      const userId = doc.id
      try {
        const success = await migrateUserProfile(userId)
        if (success) {
          result.migratedUsers.push(userId)
        } else {
          result.errors.push(`Failed to migrate profile for user: ${userId}`)
        }
      } catch (error) {
        result.errors.push(`Error migrating profile for user ${userId}: ${error}`)
      }
    }

    result.success = result.errors.length === 0
    console.log(`✅ Migration completed. Success: ${result.success}`)
    console.log(`📈 Migrated users: ${result.migratedUsers.length}`)
    console.log(`❌ Errors: ${result.errors.length}`)

    return result

  } catch (error) {
    console.error('❌ Migration failed:', error)
    result.errors.push(`Migration failed: ${error}`)
    return result
  }
}

/**
 * Validate migration results
 */
export async function validateMigration(userId: string): Promise<boolean> {
  try {
    const profileRef = adminDb.collection("profiles").doc(userId)
    const profileSnap = await profileRef.get()

    if (!profileSnap.exists) {
      console.log(`❌ Profile not found for user: ${userId}`)
      return false
    }

    const profile = profileSnap.data() as NewProfile

    // Check required fields
    const requiredFields = ['full_name', 'currency', 'onboarding_complete']
    for (const field of requiredFields) {
      if (!(field in profile)) {
        console.log(`❌ Missing required field: ${field}`)
        return false
      }
    }

    // Check new schema fields
    if (!profile.monthly_budgets) {
      console.log('❌ Missing monthly_budgets field')
      return false
    }

    console.log(`✅ Profile validation passed for user: ${userId}`)
    return true

  } catch (error) {
    console.error(`❌ Profile validation failed for user: ${userId}`, error)
    return false
  }
}

/**
 * Rollback migration for a specific user
 */
export async function rollbackUserMigration(userId: string): Promise<boolean> {
  try {
    console.log(`🔄 Rolling back migration for user: ${userId}`)

    const profileRef = adminDb.collection("profiles").doc(userId)
    const profileSnap = await profileRef.get()

    if (!profileSnap.exists) {
      console.log(`⚠️ No profile found for user: ${userId}`)
      return false
    }

    const currentProfile = profileSnap.data() as NewProfile

    // Revert to old schema structure
    const oldProfile: OldProfile = {
      full_name: currentProfile.full_name,
      goals: currentProfile.goals?.primary,
      risk_tolerance: currentProfile.risk_tolerance,
      monthly_income: currentProfile.monthly_income,
      currency: currentProfile.currency,
      onboarding_complete: currentProfile.onboarding_complete,
      updatedAt: currentProfile.updatedAt
    }

    await profileRef.set(oldProfile, { merge: true })
    console.log(`✅ Successfully rolled back migration for user: ${userId}`)

    return true
  } catch (error) {
    console.error(`❌ Failed to rollback migration for user: ${userId}`, error)
    return false
  }
}
