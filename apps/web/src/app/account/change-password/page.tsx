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
import { Lock, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { authApi } from "@/lib/api"

export default function ChangePasswordPage() {
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!currentPassword) {
      newErrors.currentPassword = "Cari şifrə tələb olunur"
    }

    if (!newPassword) {
      newErrors.newPassword = "Yeni şifrə tələb olunur"
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Şifrə ən azı 8 simvol olmalıdır"
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = "Şifrə ən azı 1 böyük hərf olmalıdır"
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = "Şifrə ən azı 1 kiçik hərf olmalıdır"
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = "Şifrə ən azı 1 rəqəm olmalıdır"
    }

    if (newPassword !== confirmPassword) {
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
      await authApi.changePassword(currentPassword, newPassword)
      router.push("/auth/login?password_changed=true")
    } catch (err: unknown) {
      if (err instanceof Error && "status" in err) {
        const apiErr = err as { status: number; message: string }
        if (apiErr.status === 401) {
          setError("Cari şifrəniz yanlışdır.")
        } else {
          setError(apiErr.message || "Şifrə dəyişmə uğursuz oldu. Zəhmət olmasa yenidən cəhd edin.")
        }
      } else {
        setError("Şifrə dəyişmə uğursuz oldu. Zəhmət olmasa yenidən cəhd edin.")
      }
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (() => {
    if (!newPassword) return { score: 0, label: "" }
    let score = 0
    if (newPassword.length >= 8) score++
    if (/[A-Z]/.test(newPassword)) score++
    if (/[a-z]/.test(newPassword)) score++
    if (/[0-9]/.test(newPassword)) score++
    if (/[^A-Za-z0-9]/.test(newPassword)) score++

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
            <h1 className="text-2xl font-bold">Şifrəni dəyiş</h1>
            <p className="text-muted-foreground mt-2">Cari şifrənizi daxil edin və yeni şifrə yaradın</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Şifrəni dəyiş</CardTitle>
              <CardDescription>Cari şifrənizi daxil edin və yeni güclü şifrə yaradın</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Cari şifrə</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-4M12 15v2m0 0v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2m0-6a2 2 0 012-2h2a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2" /></svg>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Cari şifrəniz"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">Yeni şifrə</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-4M12 15v2m0 0v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2m0-6a2 2 0 012-2h2a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2" /></svg>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Yeni şifrə"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Şifrə ən azı 8 simvol, 1 böyük hərf, 1 kiçik hərf və 1 rəqəm olmalıdır</p>
                </div>

                {newPassword && (
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-300"
                        style={{ width: `${(newPassword.length / 16) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Şifrə gücü: {newPassword.length >= 12 ? "Güclü" : newPassword.length >= 8 ? "Orta" : "Zəif"}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Yeni şifrəni təsdiqlə</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2h10a2 2 0 002 2h10a2 2 0 002-2v-4M12 15v2m0 0v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2m0-6a2 2 0 012-2h2a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 012 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m0 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2" /></svg>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Yeni şifrəni yenidən daxil edin"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Yenilənir...
                    </>
                  ) : (
                    "Şifrəni dəyiş"
                  )}
                </Button>
              </form>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  və ya
                </span>
              </div>

              <Button variant="outline" className="w-full" onClick={() => router.push("/account")}>
                Ləğv et
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}