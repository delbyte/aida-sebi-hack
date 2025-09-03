import ProfileForm from "@/components/settings/profile-form"

export default function SettingsPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <ProfileForm />
      </div>
    </main>
  )
}
