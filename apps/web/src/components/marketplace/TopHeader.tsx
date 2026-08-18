"use client"

import Link from "next/link"
import { Bell, Search, ChevronRight } from "lucide-react"

export default function TopHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[60px] max-w-[1600px] items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-[13px] font-bold text-white transition-colors duration-200 hover:bg-brand-600">
              J
            </span>
            <span className="hidden text-[15.5px] font-semibold tracking-tight text-slate-900 sm:block">
              joblane.az
            </span>
          </Link>
          <span className="ml-0.5 hidden items-center gap-1 text-[12px] text-slate-400 md:flex">
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-slate-500">Vakansiyalar</span>
          </span>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center px-6 lg:flex">
          <div className="group flex h-10 w-full max-w-md items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 transition-all duration-200 hover:border-brand-200 hover:bg-white focus-within:border-brand-300 focus-within:bg-white focus-within:shadow-sm focus-within:ring-4 focus-within:ring-brand-500/10">
            <Search className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-focus-within:text-brand-500" />
            <input
              type="text"
              placeholder="Sayt üzrə sürətli axtarış..."
              className="h-full w-full bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            <kbd className="hidden shrink-0 rounded border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 xl:block">
              /
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            defaultValue="az"
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-200 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            aria-label="Dil seçimi"
          >
            <option value="az">AZ</option>
            <option value="en">EN</option>
            <option value="ru">RU</option>
          </select>
          <button
            type="button"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-brand-500"
            aria-label="Bildirişlər"
          >
            <Bell className="h-[17px] w-[17px]" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 ring-2 ring-white" />
          </button>
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-brand-600"
          >
            Daxil ol
          </Link>
          <Link
            href="/employer/post-job"
            className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow active:scale-[0.98]"
          >
            + Elan yerləşdir
          </Link>
        </div>
      </div>
    </header>
  )
}