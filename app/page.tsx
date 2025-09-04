import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AuthDialog } from "@/components/auth-dialog"

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-5xl px-6 py-24 flex flex-col items-center text-center gap-8">
        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs">
          Trusted, secure, and personal
        </span>
        <h1 className="text-balance text-4xl md:text-6xl font-bold text-foreground">
          A.I.D.A. — Your personal financial mentor
        </h1>
        <p className="max-w-2xl text-pretty text-base md:text-lg text-muted-foreground">
          Hyper-personalized, fiduciary-level advice powered by secure Account Aggregator consent and an empathetic AI.
        </p>
        <div className="flex items-center gap-3">
          <AuthDialog 
            buttonText="Get started"
            buttonClassName="bg-primary text-primary-foreground hover:opacity-90"
            size="lg"
          />
        </div>

        <div id="how-it-works" className="grid md:grid-cols-3 gap-4 mt-12 w-full">
          <Card>
            <CardContent className="p-6 text-left">
              <h3 className="font-semibold mb-2">Consent, not storage</h3>
              <p className="text-sm text-muted-foreground">
                A.I.D.A. uses RBI-regulated Account Aggregators. Your data is accessed temporarily with your explicit
                consent.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-left">
              <h3 className="font-semibold mb-2">Immediate insights</h3>
              <p className="text-sm text-muted-foreground">
                Within seconds, see actionable insights on debt, portfolio mix, and tax opportunities.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-left">
              <h3 className="font-semibold mb-2">Chat-first experience</h3>
              <p className="text-sm text-muted-foreground">
                Ask natural questions, get precise, compliant answers tailored to your finances.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
