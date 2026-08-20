"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, Upload, Star, StarOff, Trash2, FileCheck2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { candidateApi, type CandidateResume } from "@/lib/candidate-api"

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export default function CandidateResumePage() {
  const [resumes, setResumes] = useState<CandidateResume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [title, setTitle] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      setResumes(await candidateApi.listResumes())
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Xəta" })
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

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      flash(false, "Yalnız PDF, DOC və ya DOCX faylları yüklənə bilər")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      flash(false, "Fayl ölçüsü maksimum 5MB ola bilər")
      return
    }
    setUploading(true)
    try {
      const created = await candidateApi.uploadResume(
        file,
        title.trim() || undefined,
        resumes.length === 0
      )
      setTitle("")
      setResumes((prev) =>
        created.is_default
          ? [...prev.map((r) => ({ ...r, is_default: false })), created]
          : [...prev, created]
      )
      flash(true, "CV yükləndi")
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Yükləmə xətası")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const setDefault = async (id: string) => {
    try {
      const updated = await candidateApi.updateResume(id, { is_default: true })
      setResumes((prev) => prev.map((r) => (r.id === id ? updated : { ...r, is_default: false })))
      flash(true, "Varsayılan CV yeniləndi")
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Xəta baş verdi")
    }
  }

  const remove = async (id: string) => {
    try {
      await candidateApi.deleteResume(id)
      const remaining = resumes.filter((r) => r.id !== id)
      setResumes(remaining)
      if (remaining.length > 0 && !remaining.some((r) => r.is_default)) {
        await candidateApi.updateResume(remaining[0].id, { is_default: true })
        const reloaded = await candidateApi.listResumes()
        setResumes(reloaded)
      }
      flash(true, "CV silindi")
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Xəta baş verdi")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">CV / Resume</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          CV-lərinizi yükləyin və müraciətlərdə istifadə edin. PDF, DOC və DOCX dəstəklənir (maks 5MB).
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

      {/* Upload card */}
      <section className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
            <Upload className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[14px] font-bold text-slate-800">Yeni CV yükləyin</p>
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              Yüklədiyiniz ilk CV avtomatik varsayılan olur.
            </p>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
            <input
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] outline-none focus:border-brand-400"
              placeholder="CV adı (istəyə bağlı)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 rounded-lg bg-brand-600 px-5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {uploading ? "Yüklənir..." : "Fayl seç"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        </div>
      </section>

      {/* Resume list */}
      {resumes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-[13px] text-slate-500">Hələ CV yükləməmisiniz.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {resumes.map((resume) => (
            <li key={resume.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  {resume.is_default ? (
                    <FileCheck2 className="h-5 w-5 text-brand-600" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-slate-800">
                    {resume.title || resume.file_name || "CV"}
                    {resume.is_default && (
                      <span className="ml-2 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-bold text-brand-700">
                        Varsayılan
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[12px] text-slate-500">
                    {resume.file_name}
                    {resume.file_size ? ` · ${(resume.file_size / 1024).toFixed(0)} KB` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <a
                  href={resume.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-3 py-2 text-[12px] font-semibold text-brand-600 hover:bg-brand-50"
                >
                  Bax
                </a>
                {!resume.is_default && (
                  <button
                    onClick={() => setDefault(resume.id)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600"
                    title="Varsayılan et"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                {resume.is_default && (
                  <span className="rounded-lg p-2 text-slate-300" title="Varsayılan">
                    <StarOff className="h-4 w-4" />
                  </span>
                )}
                <button
                  onClick={() => remove(resume.id)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}