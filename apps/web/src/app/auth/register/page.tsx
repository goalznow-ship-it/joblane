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
import { authApi } from "@/lib/api"
import { Mail, Lock, User, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function RegisterPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!email.trim()) {
      newErrors.email = "E-poçt ünvanı tələb olunur"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Düzgün e-poçt formatı daxil edin"
    }

    if (!password) {
      newErrors.password = "Şifrə tələb olunur"
    } else if (password.length < 8) {
      newErrors.password = "Şifrə ən azı 8 simvol olmalıdır"
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = "Şifrə ən azı 1 böyük hərf olmalıdır"
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = "Şifrə ən azı 1 kiçik hərf olmalıdır"
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = "Şifrə ən azı 1 rəqəm olmalıdır"
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Şifrələr uyğun gəlmir"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) return

    setLoading(true)

    try {
      const res = await authApi.register(email, password)
      if (res.email_verified) {
        router.push("/auth/login?registered=true")
      } else {
        router.push("/auth/resend-verification?email=" + encodeURIComponent(email))
      }
    } catch (err: unknown) {
      if (err instanceof Error && "status" in err) {
        const apiErr = err as { status: number; message: string }
        if (apiErr.status === 409) {
          setError("Bu e-poçt ünvanı artıq qeydiyyatdan keçib.")
        } else {
          setError(apiErr.message || "Qeydiyyat uğursuz oldu. Zəhmət olmasa yenidən cəhd edin.")
        }
      } else {
        setError("Qeydiyyat uğursuz oldu. Zəhmət olmasa yenidən cəhd edin.")
      }
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (() => {
    if (!password) return { score: 0, label: "" }
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    const labels = ["Çox zəif", "Zəif", "Orta", "Güclü", "Çox güclü"]
    return { score, label: labels[score] || "" }
  })()

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
            <h1 className="text-2xl font-bold">Hesab yaradın</h1>
            <p className="text-muted-foreground mt-2">Joblane ilə karyera yolunuza başlayın</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Qeydiyyatdan keçin</CardTitle>
              <CardDescription>Əlavə imkanlardan istifadə etmək üçün hesab yaradın</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

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
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                  </div>
                  {errors.email && (
                    <p id="email-error" className="text-sm text-destructive" role="alert">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Şifrə</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-4M12 15v2m0 0v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2m0-6a2 2 0 012-2h2a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 012 2v2" /></svg>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Şifrəniz"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="new-password"
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? "password-error" : "password-hint"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Şifrəni gizlə" : "Şifrəni göstər"}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.06 9.06 0 0112 5.05" /></svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" className="text-sm text-destructive" role="alert">{errors.password}</p>
                  )}
                  <p id="password-hint" className="text-xs text-muted-foreground">
                    Şifrə ən azı 8 simvol, 1 böyük hərf, 1 kiçik hərf və 1 rəqəm olmalıdır
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Şifrəni təsdiqlə</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-4M12 15v2m0 0v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2m0-6a2 2 0 012-2h2a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2" /></svg>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Şifrəni yenidən daxil edin"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="new-password"
                      aria-invalid={!!errors.confirmPassword}
                      aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p id="confirm-error" className="text-sm text-destructive" role="alert">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-300"
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{passwordStrength.label}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Qeydiyyatdan keçirilir...
                    </>
                  ) : (
                    "Qeydiyyatdan keç"
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  və ya
                </span>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Hesabınız var?{" "}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  Daxil ol
                </Link>
              </p>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Qeydiyyatdan keçərək <Link href="/privacy" className="text-primary hover:underline">Gizlilik Politikası</Link> və <Link href="/terms" className="text-primary hover:underline">İstifadə Şərtləri</Link> ilə razı olursunuz.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}