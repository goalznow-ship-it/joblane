import Link from "next/link"
import { ArrowRight, CheckCircle2, TrendingUp } from "lucide-react"
import type { Company, Category } from "@joblane/contracts"
import type { Advertisement } from "@/lib/fixtures"
import AdvertisementSlot from "./AdvertisementSlot"
import MarketSnapshot from "./MarketSnapshot"
import TrendingCategories from "./TrendingCategories"
import CompanyLogo from "./CompanyLogo"

export default function RightRail({
  ad,
  featuredCompany,
  trendingCategories,
}: {
  ad?: Advertisement
  featuredCompany?: Company
  trendingCategories: Category[]
}) {
  return (
    <aside className="hidden w-[300px] shrink-0 space-y-4 px-1 py-4 lg:block xl:px-2">
      {featuredCompany && (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border bg-slate-50/60 px-4 py-2.5">
            <h2 className="text-[13px] font-semibold text-slate-800">
              Seçilmiş işəgötürən
            </h2>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600 ring-1 ring-inset ring-brand-500/15">
              Featured
            </span>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <CompanyLogo
                name={featuredCompany.name}
                className="h-11 w-11 shrink-0 rounded-xl text-[13px]"
              />
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-slate-800">
                  {featuredCompany.name}
                </p>
                <p className="truncate text-[11.5px] text-slate-500">
                  {featuredCompany.industry}
                </p>
              </div>
            </div>
            <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-slate-500">
              {featuredCompany.description}
            </p>
            <div className="mt-3 flex items-center gap-3 text-[11.5px] text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-brand-600">
                <TrendingUp className="h-3.5 w-3.5" />
                {featuredCompany.openJobsCount} vakansiya
              </span>
              {featuredCompany.verified && (
                <span className="flex items-center gap-1 text-accent-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Təsdiqlənmiş
                </span>
              )}
            </div>
            <Link
              href={`/companies/${featuredCompany.slug}`}
              className="mt-3.5 flex items-center justify-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-[13px] font-semibold text-white shadow-sm transition-all duration-150 hover:bg-brand-600 hover:shadow active:scale-[0.98]"
            >
              Şirkətə bax
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      <MarketSnapshot />

      <TrendingCategories categories={trendingCategories} />

      {ad && <AdvertisementSlot ad={ad} />}
    </aside>
  )
}