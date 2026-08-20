"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Building2, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { employerApi, type EmployerMe } from "@/lib/employer-api"

export default function EmployerOnboardingPage() {
  const router = useRouter()
  const [me, setMe] = useState<EmployerMe | null>(null)
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", description: "", email: "" })

  useEffect(() => {
    employerApi
      .me()
      .then((data) => {
        setMe(data)
        if (data.current_company) {
          router.replace("/employer/dashboard")
        }
      })
      .catch(() => {
        router.replace("/auth/login?redirect=%2Femployer%2Fonboarding")
      })
      .finally(() => setChecking(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await employerApi.createCompany({
        name: form.name,
        description: form.description || null,
        email: form.email || null,
      })
      router.replace("/employer/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi")
    } finally {
      setSaving(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F6FD]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F6FD] p-6">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            J
          </span>
          <div>
            <p className="text-base font-bold text-slate-800">
              Joblane İşəgötürən
            </p>
            <p className="text-[12px] text-slate-500">
              {me ? `Salam, ${me.full_name || me.email}` : "Şirkət qeydiyyatı"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-brand-600" />
              Şirkət profili yaradın
            </CardTitle>
            <CardDescription>
              Şirkətinizin əsas məlumatlarını qeyd edin. Profil moderator tərəfindən
              yoxlanıldıqdan sonra vakansiyalarınız yayımlana bilər.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <Label htmlFor="name">Şirkət adı *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  minLength={2}
                  placeholder="Məs. TechSoft MMC"
                />
              </div>
              <div>
                <Label htmlFor="description">Haqqında</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={4}
                  placeholder="Şirkətiniz haqqında qısa məlumat"
                />
              </div>
              <div>
                <Label htmlFor="email">Əlaqə e-poçtu</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Şirkət yarat
              </Button>
              <p className="text-center text-[12px] text-slate-400">
                Artıq hesabınız var?{" "}
                <Link href="/auth/login" className="font-semibold text-brand-600 hover:underline">
                  Daxil ol
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}