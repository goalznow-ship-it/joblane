"use client"

import { useEffect, useState } from "react"
import { Search, SlidersHorizontal, MapPin, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { activeApi } from "@/lib/api"
import type { Category, Region } from "@joblane/contracts"

const workModes = [
  { value: "", label: "İstənilən rejim" },
  { value: "on_site", label: "Dəfəlli (ofisdə)" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Uzaqdan" },
]

const employmentTypes = [
  { value: "", label: "İş növü" },
  { value: "full_time", label: "Tam ştat" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Müqavilə əsaslı" },
  { value: "internship", label: "Staj/Təcrübə" },
]

const experiences = [
  { value: "", label: "Təcrübə" },
  { value: "entry", label: "Təcrübəsiz" },
  { value: "junior", label: "1-3 il" },
  { value: "mid", label: "3-5 il" },
  { value: "senior", label: "5+ il" },
]

const quickChips = [
  { key: "workMode", value: "remote", label: "Uzaqdan iş" },
  { key: "employmentType", value: "full_time", label: "Tam ştat" },
  { key: "salaryShown", value: "1", label: "Maaş göstərilən" },
  { key: "new", value: "1", label: "Yeni elanlar" },
]

export default function MarketplaceSearch({
  onSearch,
  categories,
  regions,
}: {
  onSearch?: (filters: Record<string, string>) => void
  categories?: Category[]
  regions?: Region[]
}) {
  const [keyword, setKeyword] = useState("")
  const [region, setRegion] = useState("")
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loadedCategories, setLoadedCategories] = useState<Category[]>(categories || [])
  const [loadedRegions, setLoadedRegions] = useState<Region[]>(regions || [])

  useEffect(() => {
    if (!categories) {
      activeApi.getCategories().then(setLoadedCategories).catch(() => setLoadedCategories([]))
    }
  }, [categories])

  useEffect(() => {
    if (!regions) {
      activeApi.getRegions().then(setLoadedRegions).catch(() => setLoadedRegions([]))
    }
  }, [regions])

  useEffect(() => {
    if (categories) setLoadedCategories(categories)
  }, [categories])

  useEffect(() => {
    if (regions) setLoadedRegions(regions)
  }, [regions])

  const set = (key: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
  }

  const toggleChip = (key: string, value: string) => {
    set(key, values[key] ? "" : value)
  }

  const reset = () => {
    setKeyword("")
    setRegion("")
    setValues({})
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch?.({ keyword, region, ...values })
  }

  const activeCount = Object.values(values).filter(Boolean).length + (region ? 1 : 0)

  return (
    <section className="rounded-xl border border-border bg-white shadow-sm">
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 p-3.5 lg:flex-row lg:items-center"
      >
        <div className="group relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-500" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Vəzifə, şirkət və ya bacarıq üzrə axtarış..."
            className="h-12 w-full rounded-xl border border-border bg-slate-50/70 pl-10 pr-3 text-[13.5px] text-slate-800 placeholder:text-slate-400 transition-all duration-150 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-border bg-slate-50/70 pl-9 pr-8 text-[13px] text-slate-700 transition-all duration-150 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 lg:w-[150px]"
            aria-label="Region"
          >
            <option value="">Region</option>
            {loadedRegions.map((r) => (
              <option key={r.id} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-12 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors duration-150",
            open || activeCount > 0
              ? "border-brand-200 bg-brand-50 text-brand-700"
              : "border-border bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtrlər
          {activeCount > 0 && (
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
        <button
          type="submit"
          className="h-12 rounded-xl bg-brand-500 px-5 text-[13.5px] font-bold text-white shadow-sm transition-all duration-150 hover:bg-brand-600 hover:shadow active:scale-[0.98]"
        >
          İş tap
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/70 px-3.5 py-1.5">
        <span className="text-[11px] font-medium text-slate-400">Tez filtr:</span>
        {quickChips.map((chip) => {
          const active = Boolean(values[chip.key])
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => toggleChip(chip.key, chip.value)}
              className={cn(
                "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11.5px] font-medium transition-colors duration-150",
                active
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-border bg-white text-slate-500 hover:border-brand-200 hover:text-brand-500"
              )}
            >
              {active && <Check className="h-3 w-3" />}
              {chip.label}
            </button>
          )
        })}
        {open && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
            Təmizlə
          </button>
        )}
      </div>

      {open && (
        <div className="grid grid-cols-2 gap-2 border-t border-border bg-slate-50/50 p-3 sm:grid-cols-3 lg:grid-cols-4">
          <select
            value={values.category ?? ""}
            onChange={(e) => set("category", e.target.value)}
            className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-700 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          >
            <option value="">Kateqoriya</option>
            {loadedCategories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={values.workMode ?? ""}
            onChange={(e) => set("workMode", e.target.value)}
            className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-700 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          >
            {workModes.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
          <select
            value={values.employmentType ?? ""}
            onChange={(e) => set("employmentType", e.target.value)}
            className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-700 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          >
            {employmentTypes.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
          <select
            value={values.experience ?? ""}
            onChange={(e) => set("experience", e.target.value)}
            className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-700 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          >
            {experiences.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={values.education ?? ""}
            onChange={(e) => set("education", e.target.value)}
            placeholder="Təhsil"
            className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          />
          <input
            type="number"
            value={values.salaryMin ?? ""}
            onChange={(e) => set("salaryMin", e.target.value)}
            placeholder="Maaş (min)"
            className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          />
          <input
            type="number"
            value={values.salaryMax ?? ""}
            onChange={(e) => set("salaryMax", e.target.value)}
            placeholder="Maaş (max)"
            className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          />
          <div className="col-span-2 flex items-center sm:col-span-3 lg:col-span-4">
            <span className="text-[11px] text-slate-400">
              {activeCount > 0
                ? `${activeCount} filtr aktivdir`
                : "Bütün vakansiyalar göstərilir"}
            </span>
            <button
              type="button"
              onClick={reset}
              className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              Təmizlə
            </button>
          </div>
        </div>
      )}
    </section>
  )
}