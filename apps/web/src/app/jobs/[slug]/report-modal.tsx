"use client"

import { useState } from "react"
import { reportApi, REPORT_REASON_LABELS } from "@/lib/api"
import { X, Loader2 } from "lucide-react"

const JOB_REASONS = [
  "SPAM",
  "SCAM",
  "FRAUD",
  "MISLEADING_INFORMATION",
  "DISCRIMINATORY_CONTENT",
  "INAPPROPRIATE_CONTENT",
  "DUPLICATE_LISTING",
  "EXPIRED_OR_INVALID",
  "SUSPICIOUS_CONTACT",
  "OTHER",
] as const

interface ReportModalProps {
  jobId: string
  jobTitle: string
  open: boolean
  onClose: () => void
}

export default function ReportModal({ jobId, jobTitle, open, onClose }: ReportModalProps) {
  const [reason, setReason] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return

    setLoading(true)
    setError("")

    try {
      await reportApi.create("JOB", jobId, reason, description.trim() || undefined)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setReason("")
        setDescription("")
      }, 2000)
    } catch (err: unknown) {
      const detail = (err as any)?.detail
      setError(typeof detail === "string" ? detail : "Şikayət göndərilmədi. Yenidən cəhd edin.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    onClose()
    setSuccess(false)
    setReason("")
    setDescription("")
    setError("")
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={handleClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {success ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900">Şikayətiniz qəbul edildi.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Şikayət et</h3>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">{jobTitle}</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Səbəb <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Səbəb seçin</option>
                  {JOB_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {REPORT_REASON_LABELS[r] || r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Əlavə məlumat
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    if (e.target.value.length <= 2000) setDescription(e.target.value)
                  }}
                  rows={4}
                  placeholder="İstəyə bağlı: ətraflı məlumat"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
                <div className="mt-1 text-right text-xs text-slate-400">{description.length}/2000</div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading || !reason}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Göndər"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
