"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { authApi } from "@/lib/api"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      router.push("/auth/forgot-password")
    }
  }, [token, router])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

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
    if (!token) return

    setLoading(true)

    try {
      await authApi.resetPassword(token, password)
      setSuccess(true)
    } catch (err: unknown) {
      if (err instanceof Error && "status" in err) {
        const apiErr = err as { status: number; message: string }
        if (apiErr.status === 400) {
          setError("Token keçərsizdir, müddəti bitib və ya artıq istifadə olunub.")
        } else {
          setError(apiErr.message || "Şifrə sıfırlama uğursuz oldu. Zəhmət olmasa yenidən cəhd edin.")
        }
      } else {
        setError("Şifrə sıfırlama uğursuz oldu. Zəhmət olmasa yenidən cəhd edin.")
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

  if (success) {
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
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h1 className="text-2xl font-bold">Şifrə uğurla dəyişdirildi</h1>
              <p className="text-muted-foreground mt-2">Yeni şifrənizlə indi sistemə daxil ola bilərsiniz</p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Button className="w-full" size="lg" onClick={() => router.push("/auth/login")}>
                    Daxil ol
                  </Button>
                  <Link href="/" className="block text-center text-primary hover:underline">
                    Ana səhifəyə qayıt
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const handleSubmitSecond = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) return
    if (!token) return

    setLoading(true)

    try {
      await authApi.resetPassword(token, password)
      setSuccess(true)
    } catch (err: unknown) {
      if (err instanceof Error && "status" in err) {
        const apiErr = err as { status: number; message: string }
        if (apiErr.status === 400) {
          setError("Token keçərsizdir, müddəti bitib və ya artıq istifadə olunub.")
        } else {
          setError(apiErr.message || "Şifrə sıfırlama uğursuz oldu. Zəhmət olmasa yenidən cəhd edin.")
        }
      } else {
        setError("Şifrə sıfırlama uğursuz oldu. Zəhmət olmasa yenidən cəhd edin.")
      }
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
            <h1 className="text-2xl font-bold">Şifrəni sıfırla</h1>
            <p className="text-muted-foreground mt-2">Yeni şifrə yaradın, hesaba davam edin</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Yeni şifrə yaradın</CardTitle>
              <CardDescription>Yeni şifrəniz təhlükəsiz olmalı və unudmadığınız bir şey olmalıdır</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c.86 0 1.682-.662 1.682-1.486V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8.514a1 1 0 001 1.486h13.856z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmitSecond} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Yeni şifrə</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-4M12 15v2m0 0v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2m0-6a2 2 0 012-2h2a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2m0-6a2 2 0 012-2h2a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2" /></svg>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Yeni şifrə"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="new-password"
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
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Şifrəni təsdiqlə</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2h10a2 2 0 002 2h10a2 2 0 002-2v-4M12 15v2m0 0v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2m0-6a2 2 0 012-2h2a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2" /></svg>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Şifrəni yenidən daxil edin"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {password && (
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-300"
                        style={{ width: `${(password.length / 16) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Şifrə gücü: {password.length >= 12 ? "Güclü" : password.length >= 8 ? "Orta" : "Zəif"}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Yenilənir...
                    </>
                  ) : (
                    "Şifrəni yenilə"
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  və ya
                </span>
              </div>

              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  Daxil ol
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}