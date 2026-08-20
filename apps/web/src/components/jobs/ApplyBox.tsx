"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bookmark, BookmarkCheck, Loader2, Send, X, FileText, LogIn } from "lucide-react"
import { authApi, ApiError } from "@/lib/api"
import {
  candidateApi,
  type CandidateResume,
} from "@/lib/candidate-api"

interface ApplyBoxProps {
  jobId: string
  jobSlug: string
  jobTitle: string
}

export function ApplyBox({ jobId, jobSlug, jobTitle }: ApplyBoxProps) {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedLoading, setSavedLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [resumes, setResumes] = useState<CandidateResume[]>([])
  const [resumeId, setResumeId] = useState<string>("")
  const [coverLetter, setCoverLetter] = useState("")
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    authApi
      .me()
      .then(async () => {
        if (cancelled) return
        setAuthenticated(true)
        try {
          const res = await candidateApi.listSaved({ limit: 200 })
          if (cancelled) return
          setSaved(res.items.some((j) => j.job_id === jobId))
        } catch {
          // ignore saved-state probe errors
        }
      })
      .catch((err) => {
        if (cancelled) return
        if (!(err instanceof ApiError && err.status === 401)) {
          // non-401 network errors: keep unauthenticated UI
        }
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [jobId])

  const openModal = async () => {
    setError(null)
    setDone(false)
    setModalOpen(true)
    try {
      const list = await candidateApi.listResumes()
      setResumes(list)
      const def = list.find((r) => r.is_default) || list[0]
      setResumeId(def ? def.id : "")
    } catch {
      setResumes([])
    }
  }

  const toggleSaved = async () => {
    setSavedLoading(true)
    setError(null)
    try {
      if (saved) {
        await candidateApi.unsaveJob(jobId)
        setSaved(false)
      } else {
        await candidateApi.saveJob(jobId)
        setSaved(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi")
    } finally {
      setSavedLoading(false)
    }
  }

  const submitApply = async () => {
    setApplying(true)
    setError(null)
    try {
      await candidateApi.apply({
        job_id: jobId,
        resume_id: resumeId || undefined,
        cover_letter: coverLetter.trim() || undefined,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi")
    } finally {
      setApplying(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="flex h-[84px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <Link
        href={`/auth/login?redirect=${encodeURIComponent(`/jobs/${jobSlug}`)}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-700"
      >
        <LogIn className="h-4 w-4" />
        Müraciət etmək üçün daxil olun
      </Link>
    )
  }

  return (
    <div className="space-y-2.5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
          {error}
        </p>
      )}

      {done ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-[13.5px] font-bold text-emerald-700">Müraciətiniz qəbul edildi!</p>
          <Link
            href="/candidate/applications"
            className="mt-2 inline-block text-[12.5px] font-semibold text-emerald-700 underline"
          >
            Müraciətlərimə bax →
          </Link>
        </div>
      ) : (
        <>
          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-700"
          >
            <Send className="h-4 w-4" />
            Müraciət et
          </button>
          <button
            onClick={toggleSaved}
            disabled={savedLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white py-2.5 text-[12.5px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {savedLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : saved ? (
              <BookmarkCheck className="h-4 w-4 text-brand-600" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {saved ? "Saxlanılıb" : "Saxla"}
          </button>
        </>
      )}

      {modalOpen && !done && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-slate-900">Müraciət et</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Bağla"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 line-clamp-2 text-[13px] font-semibold text-slate-600">{jobTitle}</p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-slate-600">CV seçin</label>
                {resumes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4 text-center">
                    <p className="text-[12.5px] text-slate-500">Hələ CV yükləməmisiniz.</p>
                    <Link
                      href="/candidate/resume"
                      onClick={() => setModalOpen(false)}
                      className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-brand-600 hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      CV yüklə
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {resumes.map((resume) => (
                      <label
                        key={resume.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors"
                        style={{
                          borderColor: resumeId === resume.id ? "#d6e4ff" : undefined,
                          backgroundColor: resumeId === resume.id ? "#f0f6ff" : undefined,
                        }}
                      >
                        <input
                          type="radio"
                          name="resume"
                          checked={resumeId === resume.id}
                          onChange={() => setResumeId(resume.id)}
                          className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-slate-700">
                            {resume.title || resume.file_name || "CV"}
                            {resume.is_default && (
                              <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                                Varsayılan
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-[11.5px] text-slate-400">{resume.file_name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-slate-600">
                  Müşayiət məktubu <span className="font-normal text-slate-400">(istəyə bağlı)</span>
                </label>
                <textarea
                  rows={4}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  maxLength={5000}
                  placeholder="İşəgötürənə qısa mesaj..."
                  className="w-full resize-none rounded-xl border border-border px-3 py-2.5 text-[13px] text-slate-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Ləğv et
              </button>
              <button
                onClick={submitApply}
                disabled={applying}
                className="flex-1 rounded-xl bg-brand-600 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {applying ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Göndərilir...
                  </span>
                ) : (
                  "Təsdiqlə"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}