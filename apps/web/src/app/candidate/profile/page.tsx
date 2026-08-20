"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Briefcase, GraduationCap, UserRound } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  candidateApi,
  CandidateApiError,
  type CandidateEducation,
  type CandidateExperience,
  type CandidateProfile,
} from "@/lib/candidate-api"

type ExperienceForm = {
  id?: string
  title: string
  company_name: string
  location: string
  start_date: string
  end_date: string
  is_current: boolean
  description: string
}

type EducationForm = {
  id?: string
  institution: string
  degree: string
  field_of_study: string
  start_date: string
  end_date: string
  is_current: boolean
  description: string
}

const emptyExperience = (): ExperienceForm => ({
  title: "",
  company_name: "",
  location: "",
  start_date: "",
  end_date: "",
  is_current: false,
  description: "",
})

const emptyEducation = (): EducationForm => ({
  institution: "",
  degree: "",
  field_of_study: "",
  start_date: "",
  end_date: "",
  is_current: false,
  description: "",
})

export default function CandidateProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [experiences, setExperiences] = useState<CandidateExperience[]>([])
  const [educations, setEducations] = useState<CandidateEducation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const [profileForm, setProfileForm] = useState({
    headline: "",
    summary: "",
    phone: "",
    location: "",
    website: "",
    linkedin_url: "",
    github_url: "",
    skills: "",
    experience_years: "",
  })

  const [expForm, setExpForm] = useState<ExperienceForm>(emptyExperience())
  const [expFormOpen, setExpFormOpen] = useState(false)

  const [eduForm, setEduForm] = useState<EducationForm>(emptyEducation())
  const [eduFormOpen, setEduFormOpen] = useState(false)

  const load = async () => {
    try {
      const [p, exps, edus] = await Promise.all([
        candidateApi.getProfile(),
        candidateApi.listExperiences(),
        candidateApi.listEducations(),
      ])
      setProfile(p)
      setExperiences(exps)
      setEducations(edus)
      setProfileForm({
        headline: p.headline || "",
        summary: p.summary || "",
        phone: p.phone || "",
        location: p.location || "",
        website: p.website || "",
        linkedin_url: p.linkedin_url || "",
        github_url: p.github_url || "",
        skills: (p.skills || []).join(", "),
        experience_years: p.experience_years != null ? String(p.experience_years) : "",
      })
    } catch (err) {
      if (err instanceof CandidateApiError && err.status === 404) {
        setProfile(null)
      } else {
        setMessage({ type: "err", text: err instanceof Error ? err.message : "Xəta" })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const flash = (ok: boolean, text: string) => {
    setMessage({ type: ok ? "ok" : "err", text })
    setTimeout(() => setMessage(null), 4000)
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const p = await candidateApi.updateProfile({
        headline: profileForm.headline || null,
        summary: profileForm.summary || null,
        phone: profileForm.phone || null,
        location: profileForm.location || null,
        website: profileForm.website || null,
        linkedin_url: profileForm.linkedin_url || null,
        github_url: profileForm.github_url || null,
        skills: profileForm.skills.split(",").map((s) => s.trim()).filter(Boolean),
        experience_years: profileForm.experience_years ? Number(profileForm.experience_years) : null,
      })
      setProfile(p)
      flash(true, "Profil yadda saxlanıldı")
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Xəta baş verdi")
    } finally {
      setSaving(false)
    }
  }

  const submitExperience = async () => {
    try {
      const payload = {
        title: expForm.title,
        company_name: expForm.company_name || null,
        location: expForm.location || null,
        start_date: expForm.start_date || null,
        end_date: expForm.is_current ? null : expForm.end_date || null,
        is_current: expForm.is_current,
        description: expForm.description || null,
      }
      if (expForm.id) {
        await candidateApi.updateExperience(expForm.id, payload)
        flash(true, "Təcrübə yeniləndi")
      } else {
        await candidateApi.createExperience(payload)
        flash(true, "Təcrübə əlavə edildi")
      }
      setExpFormOpen(false)
      setExpForm(emptyExperience())
      const exps = await candidateApi.listExperiences()
      setExperiences(exps)
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Xəta baş verdi")
    }
  }

  const deleteExperience = async (id: string) => {
    try {
      await candidateApi.deleteExperience(id)
      setExperiences((prev) => prev.filter((e) => e.id !== id))
      flash(true, "Təcrübə silindi")
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Xəta baş verdi")
    }
  }

  const submitEducation = async () => {
    try {
      const payload = {
        institution: eduForm.institution,
        degree: eduForm.degree || null,
        field_of_study: eduForm.field_of_study || null,
        start_date: eduForm.start_date || null,
        end_date: eduForm.is_current ? null : eduForm.end_date || null,
        is_current: eduForm.is_current,
        description: eduForm.description || null,
      }
      if (eduForm.id) {
        await candidateApi.updateEducation(eduForm.id, payload)
        flash(true, "Təhsil yeniləndi")
      } else {
        await candidateApi.createEducation(payload)
        flash(true, "Təhsil əlavə edildi")
      }
      setEduFormOpen(false)
      setEduForm(emptyEducation())
      const edus = await candidateApi.listEducations()
      setEducations(edus)
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Xəta baş verdi")
    }
  }

  const deleteEducation = async (id: string) => {
    try {
      await candidateApi.deleteEducation(id)
      setEducations((prev) => prev.filter((e) => e.id !== id))
      flash(true, "Təhsil silindi")
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Xəta baş verdi")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Namizəd profili</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Peşəkar profilinizi doldurun — işəgötürənlər müraciət etdiyiniz zaman bunu görəcək.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-[13px] font-semibold ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile section */}
      <section className="rounded-2xl border border-border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-4 w-4 text-brand-500" />
          <h2 className="text-[14.5px] font-bold text-slate-900">Əsas məlumatlar</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Peşə başlığı</label>
            <input
              className={inputCls}
              placeholder="Məs: Senior Frontend Developer"
              value={profileForm.headline}
              onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Qısa məlumat</label>
            <textarea
              className={inputCls}
              rows={4}
              placeholder="Özünüz haqqında qısa məlumat"
              value={profileForm.summary}
              onChange={(e) => setProfileForm({ ...profileForm, summary: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Telefon</label>
            <input
              className={inputCls}
              placeholder="+994..."
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Şəhər</label>
            <input
              className={inputCls}
              placeholder="Bakı"
              value={profileForm.location}
              onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Veb sayt</label>
            <input
              className={inputCls}
              placeholder="https://..."
              value={profileForm.website}
              onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">LinkedIn</label>
            <input
              className={inputCls}
              placeholder="https://linkedin.com/in/..."
              value={profileForm.linkedin_url}
              onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">GitHub</label>
            <input
              className={inputCls}
              placeholder="https://github.com/..."
              value={profileForm.github_url}
              onChange={(e) => setProfileForm({ ...profileForm, github_url: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">İl təcrübə</label>
            <input
              className={inputCls}
              type="number"
              min={0}
              placeholder="3"
              value={profileForm.experience_years}
              onChange={(e) => setProfileForm({ ...profileForm, experience_years: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Bacarıqlar (vergüllə ayırın)</label>
            <input
              className={inputCls}
              placeholder="Python, FastAPI, SQL"
              value={profileForm.skills}
              onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Yadda saxlanılır..." : "Yadda saxla"}
          </button>
        </div>
      </section>

      {/* Experience section */}
      <section className="rounded-2xl border border-border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-brand-500" />
            <h2 className="text-[14.5px] font-bold text-slate-900">İş təcrübəsi</h2>
          </div>
          <button
            onClick={() => {
              setExpForm(emptyExperience())
              setExpFormOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Əlavə et
          </button>
        </div>

        {experiences.length === 0 && !expFormOpen && (
          <p className="py-4 text-center text-[13px] text-slate-400">Hələ təcrübə əlavə olunmayıb.</p>
        )}

        <ul className="divide-y divide-border">
          {experiences.map((exp) => (
            <li key={exp.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-slate-800">{exp.title}</p>
                <p className="text-[12.5px] text-slate-500">
                  {exp.company_name}
                  {exp.start_date && ` · ${exp.start_date}${exp.is_current ? " — hal-hazırda" : exp.end_date ? ` — ${exp.end_date}` : ""}`}
                </p>
                {exp.description && <p className="mt-1 line-clamp-2 text-[12px] text-slate-500">{exp.description}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => {
                    setExpForm({
                      id: exp.id,
                      title: exp.title,
                      company_name: exp.company_name || "",
                      location: exp.location || "",
                      start_date: exp.start_date || "",
                      end_date: exp.end_date || "",
                      is_current: exp.is_current,
                      description: exp.description || "",
                    })
                    setExpFormOpen(true)
                  }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600"
                  aria-label="Redaktə et"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteExperience(exp.id)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {expFormOpen && (
          <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-600">Vəzifə *</label>
                <input
                  className={inputCls}
                  placeholder="Backend Developer"
                  value={expForm.title}
                  onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-600">Şirkət</label>
                <input
                  className={inputCls}
                  placeholder="Tech Co"
                  value={expForm.company_name}
                  onChange={(e) => setExpForm({ ...expForm, company_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-slate-600">Başlanğıc</label>
                  <input
                    className={inputCls}
                    type="date"
                    value={expForm.start_date}
                    onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-slate-600">Bitmə</label>
                  <input
                    className={inputCls}
                    type="date"
                    disabled={expForm.is_current}
                    value={expForm.end_date}
                    onChange={(e) => setExpForm({ ...expForm, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-[12.5px] font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={expForm.is_current}
                    onChange={(e) => setExpForm({ ...expForm, is_current: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Hal-hazırda çalışıram
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[12px] font-semibold text-slate-600">Ətraflı</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setExpFormOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Ləğv et
              </button>
              <button
                onClick={submitExperience}
                disabled={!expForm.title.trim()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {expForm.id ? "Yenilə" : "Əlavə et"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Education section */}
      <section className="rounded-2xl border border-border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-brand-500" />
            <h2 className="text-[14.5px] font-bold text-slate-900">Təhsil</h2>
          </div>
          <button
            onClick={() => {
              setEduForm(emptyEducation())
              setEduFormOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Əlavə et
          </button>
        </div>

        {educations.length === 0 && !eduFormOpen && (
          <p className="py-4 text-center text-[13px] text-slate-400">Hələ təhsil əlavə olunmayıb.</p>
        )}

        <ul className="divide-y divide-border">
          {educations.map((edu) => (
            <li key={edu.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-slate-800">{edu.institution}</p>
                <p className="text-[12.5px] text-slate-500">
                  {edu.degree}
                  {edu.field_of_study && ` · ${edu.field_of_study}`}
                  {edu.start_date && ` · ${edu.start_date}${edu.is_current ? " — hal-hazırda" : edu.end_date ? ` — ${edu.end_date}` : ""}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => {
                    setEduForm({
                      id: edu.id,
                      institution: edu.institution,
                      degree: edu.degree || "",
                      field_of_study: edu.field_of_study || "",
                      start_date: edu.start_date || "",
                      end_date: edu.end_date || "",
                      is_current: edu.is_current,
                      description: edu.description || "",
                    })
                    setEduFormOpen(true)
                  }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600"
                  aria-label="Redaktə et"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteEducation(edu.id)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {eduFormOpen && (
          <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-600">Təhsil müəssisəsi *</label>
                <input
                  className={inputCls}
                  placeholder="ADA University"
                  value={eduForm.institution}
                  onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-600">Dərəcə</label>
                <input
                  className={inputCls}
                  placeholder="Bakalavr, Magistr..."
                  value={eduForm.degree}
                  onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-600">İxtisas</label>
                <input
                  className={inputCls}
                  placeholder="Kompüter elmləri"
                  value={eduForm.field_of_study}
                  onChange={(e) => setEduForm({ ...eduForm, field_of_study: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-slate-600">Başlanğıc</label>
                  <input
                    className={inputCls}
                    type="date"
                    value={eduForm.start_date}
                    onChange={(e) => setEduForm({ ...eduForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-slate-600">Bitmə</label>
                  <input
                    className={inputCls}
                    type="date"
                    disabled={eduForm.is_current}
                    value={eduForm.end_date}
                    onChange={(e) => setEduForm({ ...eduForm, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-[12.5px] font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={eduForm.is_current}
                    onChange={(e) => setEduForm({ ...eduForm, is_current: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Hal-hazırda təhsil alıram
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[12px] font-semibold text-slate-600">Ətraflı</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={eduForm.description}
                  onChange={(e) => setEduForm({ ...eduForm, description: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setEduFormOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Ləğv et
              </button>
              <button
                onClick={submitEducation}
                disabled={!eduForm.institution.trim()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {eduForm.id ? "Yenilə" : "Əlavə et"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}