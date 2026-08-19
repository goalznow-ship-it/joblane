"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { adminApi, type AdminCategory, type CategoryListResponse, type CategoryUpdateRequest } from "@/lib/admin-api"
import { Search, Loader2, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Eye, Check, X, Archive, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 15

export default function AdminCategoriesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [q, setQ] = useState(searchParams.get("q") || "")
  const [isActive, setIsActive] = useState(searchParams.get("is_active") || "ALL")
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState("sort_asc")
  const [data, setData] = useState<CategoryListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createSlug, setCreateSlug] = useState("")
  const [createIcon, setCreateIcon] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createSeoTitle, setCreateSeoTitle] = useState("")
  const [createSeoDescription, setCreateSeoDescription] = useState("")
  const [createSortOrder, setCreateSortOrder] = useState(0)
  const [createIsActive, setCreateIsActive] = useState(true)
  const [createError, setCreateError] = useState("")

  const [editOpen, setEditOpen] = useState<string | null>(null)
  const [editData, setEditData] = useState<CategoryUpdateRequest>({})
  const [editError, setEditError] = useState("")

  const fetchList = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .listCategories({
        q: q || undefined,
        is_active: isActive === "ALL" ? undefined : isActive === "true",
        page,
        limit: PAGE_SIZE,
        sort,
      })
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [q, isActive, page, sort])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (isActive !== "ALL") params.set("is_active", isActive)
    const qs = params.toString()
    router.replace(qs ? `/admin/categories?${qs}` : "/admin/categories", { scroll: false })
  }, [q, isActive, router])

  const totalPages = data?.total_pages || 1

  const handleCreate = async () => {
    setCreateError("")
    try {
      await adminApi.createCategory({
        name: createName,
        slug: createSlug,
        icon: createIcon || undefined,
        description: createDescription || undefined,
        seo_title: createSeoTitle || undefined,
        seo_description: createSeoDescription || undefined,
        sort_order: createSortOrder,
        is_active: createIsActive,
      })
      setCreateOpen(false)
      setCreateName("")
      setCreateSlug("")
      setCreateIcon("")
      setCreateDescription("")
      setCreateSeoTitle("")
      setCreateSeoDescription("")
      setCreateSortOrder(0)
      setCreateIsActive(true)
      fetchList()
    } catch (err) {
      setCreateError(String(err))
    }
  }

  const handleEdit = async (id: string) => {
    setEditError("")
    try {
      await adminApi.updateCategory(id, editData)
      setEditOpen(null)
      setEditData({})
      fetchList()
    } catch (err) {
      setEditError(String(err))
    }
  }

  const handleStatus = async (id: string, action: "activate" | "deactivate" | "archive") => {
    if (!confirm(`Kateqoriyanı ${action === "activate" ? "aktiv" : action === "deactivate" ? "deaktiv" : "arxiv"} etmək istəyirsiniz?`)) return
    try {
      await adminApi.changeCategoryStatus(id, action)
      fetchList()
    } catch (err) {
      alert(String(err))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Kateqoriyanı silmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.")) return
    try {
      await adminApi.updateCategory(id, { is_active: false })
      fetchList()
    } catch (err) {
      alert(String(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kateqoriyalar</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `Cəmi ${data.total} kateqoriya` : "Yüklənir..."}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
        >
          <Plus className="h-4 w-4" /> Yeni kateqoriya
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Kateqoriya adı, slug üzrə axtar..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">Hamısı</option>
            <option value="true">Aktiv</option>
            <option value="false">Deaktiv</option>
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="sort_asc">Sıralama (artan)</option>
            <option value="sort_desc">Sıralama (azalan)</option>
            <option value="name_asc">Ad (A-Z)</option>
            <option value="created_desc">Yaradılma (yeni)</option>
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
          <div className="px-6 py-16 text-center text-sm text-slate-400">Nəticə tapılmadı</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5 font-semibold">Kateqoriya</th>
                  <th className="px-4 py-3.5 font-semibold">Slug</th>
                  <th className="px-4 py-3.5 font-semibold">İkon</th>
                  <th className="px-4 py-3.5 font-semibold">Vakansiyalar</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Sıralama</th>
                  <th className="px-4 py-3.5 font-semibold">Yaradılma</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((cat: any) => (
                  <tr key={cat.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="max-w-[280px] px-6 py-4">
                      <div className="flex items-center gap-2">
                        {cat.icon && <span className="h-5 w-5">{cat.icon}</span>}
                        <div className="truncate font-semibold text-slate-900">{cat.name}</div>
                      </div>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-4 text-slate-600">{cat.slug}</td>
                    <td className="px-4 py-4 text-center">
                      {cat.icon ? <span className="text-lg">{cat.icon}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {cat.active_jobs_count !== null ? (
                        <>
                          <span className="font-semibold text-slate-900">{cat.active_jobs_count || 0}</span>
                          <span className="text-slate-400"> / </span>
                          <span className="text-slate-500">{cat.total_jobs_count || 0}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", cat.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                        {cat.is_active ? "Aktiv" : "Deaktiv"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">{cat.sort_order}</td>
                    <td className="px-4 py-4 text-slate-500">{cat.created_at ? new Date(cat.created_at).toLocaleDateString("az-AZ") : "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/categories/${cat.id}/edit`} className="text-xs font-semibold text-[#2563EB] hover:underline mr-2">
                        Redaktə et
                      </Link>
                      <button
                        onClick={() => handleStatus(cat.id, cat.is_active ? "deactivate" : "activate")}
                        className="text-xs font-semibold text-amber-600 hover:underline mr-2"
                      >
                        {cat.is_active ? "Deaktiv et" : "Aktiv et"}
                      </button>
                      <button
                        onClick={() => handleStatus(cat.id, "archive")}
                        className="text-xs font-semibold text-slate-600 hover:underline mr-2"
                      >
                        Arxivləşdir
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Sil
                      </button>
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
              Səhifə {data.page} / {data.total_pages} · {data.total} nəticə
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
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page >= data.total_pages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sonrakı <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setCreateOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Yeni kateqoriya yarat</h3>
            <p className="mt-1 text-sm text-slate-500">Bütün sahələri doldurun.</p>
            {createError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{createError}</div>}
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Ad <span className="text-red-500">*</span></label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Slug <span className="text-red-500">*</span></label>
                <input
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">İkon</label>
                <input
                  value={createIcon}
                  onChange={(e) => setCreateIcon(e.target.value)}
                  placeholder="📂, 💼, 💻, etc."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Təsvir</label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">SEO Title</label>
                <input
                  value={createSeoTitle}
                  onChange={(e) => setCreateSeoTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">SEO Description</label>
                <textarea
                  value={createSeoDescription}
                  onChange={(e) => setCreateSeoDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Sıralama</label>
                  <input
                    type="number"
                    value={createSortOrder}
                    onChange={(e) => setCreateSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={createIsActive}
                      onChange={(e) => setCreateIsActive(e.target.checked)}
                      className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    Aktiv
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setCreateOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Ləğv et
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
              >
                Yarat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}