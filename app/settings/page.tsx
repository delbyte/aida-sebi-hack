import ProfileForm from "@/components/settings/profile-form"
import MemoryManager from "@/components/settings/memory-manager"
import { PageLayout } from "@/components/page-layout"

export default function SettingsPage() {
  return (
    <PageLayout
      title="Settings"
      description="Manage your profile and AI memory preferences"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          <ProfileForm />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">AI Memory</h2>
          <MemoryManager />
        </section>
      </div>
    </PageLayout>
  )
}
