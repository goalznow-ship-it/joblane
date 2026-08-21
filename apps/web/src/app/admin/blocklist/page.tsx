"use client"

import { useCallback, useEffect, useState } from "react"
import { adminBlocklistApi, type BlocklistEntry } from "@/lib/api"
import { Search, Loader2, ChevronLeft, ChevronRight, Plus, Ban } from "lucide-react"
import { cn } from "@/lib/utils"

const TYPE_LABELS: Record<string, string> = {
  EMAIL: "E-poçt",
  DOMAIN: "Domen",
  IP: "IP ünvanı",
  PHONE: "Telefon",
  KEYWORD: "Açar söz",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  EXPIRED: "bg-amber-100 text-amber-700",
}

const PAGE_SIZE = 20

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminBlocklistPage() {
  const [type, setType] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ items: BlocklistEntry[]; total: number; page: number; limit: number; total_pages: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showAdd, setShowAdd] = useState(false)
  const [addType, setAddType] = useState("EMAIL")
  const [addValue, setAddValue] = useState("")
  const [addReason, setAddReason] = useState("")
  const [addNote, setAddNote] = useState("")
  const [busy, setBusy] = useState(false)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError("")
    adminBlocklistApi
      .list({
        type: type || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [type, status, page])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleAdd = async () => {
    setBusy(true)
    try {
      await adminBlocklistApi.create(addType, addValue.trim(), addReason.trim() || undefined, addNote.trim() || undefined)
      setShowAdd(false)
      setAddValue("")
      setAddReason("")
      setAddNote("")
      fetchList()
    } catch (err) {
      const detail = (err as any)?.detail
      alert(typeof detail === "string" ? detail : "Əlavə etmə uğursuz oldu")
    } finally {
      setBusy(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm("Bu qeyri-aktivləşdirmək istəyirsiniz?")) return
    setBusy(true)
    try {
      await adminBlocklistApi.deactivate(id)
      fetchList()
    } catch (err) {
      const detail = (err as any)?.detail
      alert(typeof detail === "string" ? detail : "Əməliyyat uğursuz oldu")
    } finally {
      setBusy(false)
    }
  }

  const totalPages = data?.total_pages || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Qara siyahı</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `Cəmi ${data.total} qeyd` : "Yüklənir..."}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
        >
          <Plus className="h-4 w-4" /> Əlavə et
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1) }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="">Hamısı</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="">Status</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="INACTIVE">Qeyri-aktiv</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
            Yüklənir...
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-sm text-red-600">Xəta: {error}</div>
        ) : !data || data.items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">Qeyd tapılmadı</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5 font-semibold">Növ</th>
                  <th className="px-4 py-3.5 font-semibold">Dəyər</th>
                  <th className="px-4 py-3.5 font-semibold">Səbəb</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Yaradıldı</th>
                  <th className="px-4 py-3.5 font-semibold">Bitmə</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        {TYPE_LABELS[entry.type] || entry.type}
                      </span>
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-4 font-mono text-xs text-slate-800">
                      {entry.value_normalized}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-4 text-slate-600">
                      {entry.reason || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", STATUS_COLORS[entry.status] || "bg-slate-100 text-slate-600")}>
                        {entry.status === "ACTIVE" ? "Aktiv" : entry.status === "INACTIVE" ? "Qeyri-aktiv" : entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {fmtDate(entry.created_at)}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {fmtDate(entry.expires_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {entry.status === "ACTIVE" && (
                        <button
                          onClick={() => handleDeactivate(entry.id)}
                          disabled={busy}
                          className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                        >
                          Qeyri-aktiv et
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5">
            <div className="text-xs text-slate-400">
              Səhifə {data.page} / {totalPages} · {data.total} nəticə
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Əvvəl
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sonrakı <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Qara siyahıya əlavə et</h3>
            <p className="mt-1 text-sm text-slate-500">Yeni qeyd əlavə edin.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Növ <span className="text-red-500">*</span>
                </label>
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Dəyər <span className="text-red-500">*</span>
                </label>
                <input
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  placeholder="E-poçt, domen, IP və s."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Səbəb</label>
                <textarea
                  value={addReason}
                  onChange={(e) => setAddReason(e.target.value)}
                  rows={2}
                  placeholder="Səbəb"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Qeyd</label>
                <textarea
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  rows={2}
                  placeholder="Daxili qeyd"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Ləğv et
              </button>
              <button
                onClick={handleAdd}
                disabled={busy || !addValue.trim()}
                className="flex-1 rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Əlavə et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
