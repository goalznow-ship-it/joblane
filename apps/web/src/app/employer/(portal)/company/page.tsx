"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Save,
  Loader2,
  Upload,
  Image as ImageIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  employerApi,
  type EmployerCompany,
} from "@/lib/employer-api"

export default function EmployerCompanyPage() {
  const [company, setCompany] = useState<EmployerCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: "",
    description: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    industry: "",
    linkedin: "",
    instagram: "",
    facebook: "",
  })

  useEffect(() => {
    employerApi
      .getCompany()
      .then((data) => {
        setCompany(data)
        setForm({
          name: data.name || "",
          description: data.description || "",
          website: data.website || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          industry: data.industry_name || "",
          linkedin: data.socials?.linkedin || "",
          instagram: data.socials?.instagram || "",
          facebook: data.socials?.facebook || "",
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Xəta"))
      .finally(() => setLoading(false))
  }, [])

  const patch = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError(null)
    try {
      const socials: Record<string, string> = {}
      if (form.linkedin) socials.linkedin = form.linkedin
      if (form.instagram) socials.instagram = form.instagram
      if (form.facebook) socials.facebook = form.facebook
      const updated = await employerApi.updateCompany({
        name: form.name,
        description: form.description || null,
        website: form.website || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        socials,
      })
      setCompany(updated)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi")
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = useCallback(
    async (kind: "logo" | "cover", file: File) => {
      if (kind === "logo") setUploadingLogo(true)
      else setUploadingCover(true)
      setError(null)
      try {
        const { url } =
          kind === "logo"
            ? await employerApi.uploadLogo(file)
            : await employerApi.uploadCover(file)
        const updated = await employerApi.updateCompany(
          kind === "logo" ? { logo_url: url } : { cover_url: url }
        )
        setCompany(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Yükləmə xətası")
      } finally {
        setUploadingLogo(false)
        setUploadingCover(false)
      }
    },
    []
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Şirkət profili</h1>
          <p className="mt-1 text-sm text-slate-500">
            Şirkətiniz haqqında məlumatları idarə edin
          </p>
        </div>
        {company && (
          <Badge variant={company.status === "VERIFIED" ? "default" : "secondary"}>
            {company.status === "VERIFIED"
              ? "Təsdiqlənmiş"
              : company.status === "PENDING"
                ? "Təsdiq gözləyir"
                : company.status}
          </Badge>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Profil uğurla yeniləndi
        </div>
      )}

      {/* Cover + logo */}
      <Card>
        <CardContent className="p-0">
          <div
            className="relative flex h-36 items-center justify-center rounded-t-xl bg-gradient-to-br from-brand-500 to-brand-800 bg-cover bg-center sm:h-44"
            style={
              company?.cover_url
                ? { backgroundImage: `url(${company.cover_url})` }
                : undefined
            }
          >
            {!company?.cover_url && (
              <ImageIcon className="h-8 w-8 text-white/40" aria-hidden="true" />
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute bottom-3 right-3 bg-white/90 backdrop-blur"
              disabled={uploadingCover}
              onClick={() => coverInputRef.current?.click()}
            >
              {uploadingCover ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Üz şəkli
            </Button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload("cover", file)
              }}
            />
          </div>
          <div className="relative px-5 pb-5">
            <div className="flex items-end gap-4">
              <div className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-sm">
                {company?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <div className="flex-1 pb-1">
                <h2 className="text-lg font-bold text-slate-800">
                  {company?.name}
                </h2>
                <p className="text-[13px] text-slate-500">
                  {company?.industry_name || "Sahə seçilməyib"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                {uploadingLogo ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                )}
                Loqo
              </Button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload("logo", file)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info form */}
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Əsas məlumatlar</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Şirkət adı</Label>
              <Input
                id="name"
                value={form.name}
                onChange={patch("name")}
                required
                minLength={2}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Haqqında</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={patch("description")}
                rows={4}
                placeholder="Şirkətiniz haqqında qısa məlumat"
              />
            </div>
            <div>
              <Label htmlFor="website">
                <Globe className="mr-1 inline h-3.5 w-3.5" /> Veb sayt
              </Label>
              <Input
                id="website"
                type="url"
                value={form.website}
                onChange={patch("website")}
                placeholder="https://example.az"
              />
            </div>
            <div>
              <Label htmlFor="email">
                <Mail className="mr-1 inline h-3.5 w-3.5" /> E-poçt
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={patch("email")}
              />
            </div>
            <div>
              <Label htmlFor="phone">
                <Phone className="mr-1 inline h-3.5 w-3.5" /> Telefon
              </Label>
              <Input id="phone" value={form.phone} onChange={patch("phone")} />
            </div>
            <div>
              <Label htmlFor="address">
                <MapPin className="mr-1 inline h-3.5 w-3.5" /> Ünvan
              </Label>
              <Input
                id="address"
                value={form.address}
                onChange={patch("address")}
              />
            </div>
            <div>
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={form.linkedin}
                onChange={patch("linkedin")}
                placeholder="https://linkedin.com/company/..."
              />
            </div>
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={form.instagram}
                onChange={patch("instagram")}
              />
            </div>
            <div>
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={form.facebook}
                onChange={patch("facebook")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Yadda saxla
          </Button>
        </div>
      </form>
    </div>
  )
}