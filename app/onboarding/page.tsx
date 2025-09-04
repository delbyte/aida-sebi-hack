import { EnhancedOnboardingWizard } from "@/components/onboarding/enhanced-wizard"
import { PageLayout } from "@/components/page-layout"

export default function OnboardingPage() {
  return (
    <PageLayout requireAuth={false} padding="px-6 py-12" maxWidth="max-w-2xl">
      <div className="flex items-center justify-center min-h-[60vh]">
        <EnhancedOnboardingWizard />
      </div>
    </PageLayout>
  )
}
