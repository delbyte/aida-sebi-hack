import { EnhancedOnboardingWizard } from "@/components/onboarding/enhanced-wizard"

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <EnhancedOnboardingWizard />
      </div>
    </main>
  )
}
