"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { authApi } from "@/lib/api"

export default function ResendVerificationPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError("E-poçt ünvanı tələb olunur")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Düzgün e-poçt formatı daxil edin")
      return
    }

    setLoading(true)

    try {
      await authApi.resendVerification(email)
      setSubmitted(true)
    } catch (err) {
      setError("Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 lg:py-20 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6" aria-label="Joblane - Ana səhifə">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                J
              </div>
              <span className="font-bold text-xl">Joblane</span>
            </Link>

            {submitted ? (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                  <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h1 className="text-2xl font-bold">E-poçt göndərildi</h1>
                <p className="text-muted-foreground mt-2">
                  Əgər <strong>{email}</strong> ünvanı ilə hesab mövcudsə,
                  təsdiq linki yenidən göndərildi.
                </p>
              </>
            ) : (
              <>
                <Link href="/" className="inline-flex items-center gap-2 mb-6" aria-label="Joblane - Ana səhifə">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                    J
                  </div>
                  <span className="font-bold text-xl">Joblane</span>
                </Link>
                <h1 className="text-2xl font-bold">Təsdiq e-poçtunu yenidən göndər</h1>
                <p className="text-muted-foreground mt-2">E-poçt ünvanınızı daxil edin, təsdiq linkini yenidən göndəracəq</p>
              </>
            )}
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{submitted ? "Yoxlayın e-poçtunuzu" : "Təsdiq e-poçtunu yenidən göndər"}</CardTitle>
              <CardDescription>
                {submitted
                  ? "Təsdiq linki e-poçt ünvanınıza göndərildi. Spam qovluğunu da yoxlayın."
                  : "E-poçt ünvanınızı daxil edin, təsdiq linkini yenidən göndəracəq"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c.86 0 1.682-.662 1.682-1.486V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8.514a1 1 0 001 1.486h13.856z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span>{error}</span>
                </div>
              )}

              {!submitted && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-poçt ünvanı</Label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      <Input
                        id="email"
                        type="email"
                        placeholder="siz@misal.az"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        autoComplete="email"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Göndərilir...
                      </>
                    ) : (
                      "Təsdiq linki göndər"
                    )}
                  </Button>
                </form>
              )}

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  və ya
                </span>
              </div>

              <Button variant="outline" className="w-full" onClick={() => router.push("/auth/login")}>
                Daxil ol
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Hesabınız yoxdur?{" "}
            <Link href="/auth/register" className="text-primary hover:underline font-medium">
              Qeydiyyatdan keçin
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}