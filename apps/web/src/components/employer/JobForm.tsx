"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  employerApi,
  type EmployerJob,
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
} from "@/lib/employer-api"

export interface JobFormValues {
  title: string
  description: string
  requirements: string
  responsibilities: string
  benefits: string
  salary_min: string
  salary_max: string
  salary_currency: string
  salary_visible: boolean
  location: string
  employment_type: string
  work_mode: string
  experience_level: string
  education: string
  application_deadline: string
}

export const EMPTY_FORM: JobFormValues = {
  title: "",
  description: "",
  requirements: "",
  responsibilities: "",
  benefits: "",
  salary_min: "",
  salary_max: "",
  salary_currency: "AZN",
  salary_visible: true,
  location: "",
  employment_type: "",
  work_mode: "",
  experience_level: "",
  education: "",
  application_deadline: "",
}

export function jobToForm(job: EmployerJob): JobFormValues {
  return {
    title: job.title || "",
    description: job.description || "",
    requirements: job.requirements || "",
    responsibilities: job.responsibilities || "",
    benefits: job.benefits || "",
    salary_min: job.salary_min != null ? String(job.salary_min) : "",
    salary_max: job.salary_max != null ? String(job.salary_max) : "",
    salary_currency: job.salary_currency || "AZN",
    salary_visible: job.salary_visible !== false,
    location: job.location || "",
    employment_type: job.employment_type || "",
    work_mode: job.work_mode || "",
    experience_level: job.experience_level || "",
    education: job.education || "",
    application_deadline: job.application_deadline
      ? job.application_deadline.slice(0, 10)
      : "",
  }
}

export default function JobForm({
  initial,
  jobId,
  submitLabel = "Yadda saxla",
  onSaved,
}: {
  initial: JobFormValues
  jobId?: string
  submitLabel?: string
  onSaved?: (job: EmployerJob) => void
}) {
  const router = useRouter()
  const [form, setForm] = useState<JobFormValues>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch =
    (key: keyof JobFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        requirements: form.requirements || null,
        responsibilities: form.responsibilities || null,
        benefits: form.benefits || null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        salary_currency: form.salary_currency || "AZN",
        salary_visible: form.salary_visible,
        location: form.location || null,
        employment_type: form.employment_type,
        work_mode: form.work_mode || null,
        experience_level: form.experience_level || null,
        education: form.education || null,
        application_deadline: form.application_deadline
          ? `${form.application_deadline}T23:59:59Z`
          : null,
      }
      const job = jobId
        ? await employerApi.updateJob(jobId, payload)
        : await employerApi.createJob(payload)
      onSaved?.(job)
      router.push(`/employer/jobs/${job.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-border bg-white p-5">
        <h2 className="text-[15px] font-bold text-slate-800">Ümumi məlumatlar</h2>
        <div>
          <Label htmlFor="title">Vəzifə adı *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={patch("title")}
            required
            minLength={3}
            placeholder="Məs. Frontend Developer"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="employment_type">Məşğulluq növü *</Label>
            <Select
              value={form.employment_type}
              onValueChange={(v) => setForm((f) => ({ ...f, employment_type: v }))}
            >
              <SelectTrigger id="employment_type">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="work_mode">İş rejimi</Label>
            <Select
              value={form.work_mode}
              onValueChange={(v) => setForm((f) => ({ ...f, work_mode: v }))}
            >
              <SelectTrigger id="work_mode">
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WORK_MODE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="location">Yerləşmə</Label>
            <Input
              id="location"
              value={form.location}
              onChange={patch("location")}
              placeholder="Məs. Bakı"
            />
          </div>
          <div>
            <Label htmlFor="experience_level">Təcrübə səviyyəsi</Label>
            <Input
              id="experience_level"
              value={form.experience_level}
              onChange={patch("experience_level")}
              placeholder="Məs. 1-3 il"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-white p-5">
        <h2 className="text-[15px] font-bold text-slate-800">Əmək haqqı</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="salary_min">Minimum (AZN)</Label>
            <Input
              id="salary_min"
              type="number"
              min={0}
              value={form.salary_min}
              onChange={patch("salary_min")}
              placeholder="1000"
            />
          </div>
          <div>
            <Label htmlFor="salary_max">Maksimum (AZN)</Label>
            <Input
              id="salary_max"
              type="number"
              min={0}
              value={form.salary_max}
              onChange={patch("salary_max")}
              placeholder="2000"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={form.salary_visible}
            onCheckedChange={(v) => setForm((f) => ({ ...f, salary_visible: Boolean(v) }))}
          />
          <Label htmlFor="salary_visible" className="cursor-pointer">
            Maaşı namizədlərə göstər
          </Label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-white p-5">
        <h2 className="text-[15px] font-bold text-slate-800">Vəzifə haqqında</h2>
        <div>
          <Label htmlFor="description">Vəzifə təsviri</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={patch("description")}
            rows={5}
            placeholder="Vəzifənin məqsədi və ümumi təsviri"
          />
        </div>
        <div>
          <Label htmlFor="requirements">Tələblər</Label>
          <Textarea
            id="requirements"
            value={form.requirements}
            onChange={patch("requirements")}
            rows={4}
            placeholder="Hər bir tələb yeni sətirdə"
          />
        </div>
        <div>
          <Label htmlFor="responsibilities">Vəzifə öhdəlikləri</Label>
          <Textarea
            id="responsibilities"
            value={form.responsibilities}
            onChange={patch("responsibilities")}
            rows={4}
          />
        </div>
        <div>
          <Label htmlFor="benefits">İmtiyazlar</Label>
          <Textarea
            id="benefits"
            value={form.benefits}
            onChange={patch("benefits")}
            rows={3}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="education">Təhsil</Label>
            <Input
              id="education"
              value={form.education}
              onChange={patch("education")}
              placeholder="Məs. Ali"
            />
          </div>
          <div>
            <Label htmlFor="application_deadline">Müraciət son tarixi</Label>
            <Input
              id="application_deadline"
              type="date"
              value={form.application_deadline}
              onChange={patch("application_deadline")}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Ləğv et
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}