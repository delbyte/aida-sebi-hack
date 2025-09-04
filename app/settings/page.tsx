import ProfileForm from "@/components/settings/profile-form"
import MemoryManager from "@/components/settings/memory-manager"

export default function SettingsPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        
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
      </div>
    </main>
  )
}
