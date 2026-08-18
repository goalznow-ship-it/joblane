import Link from "next/link"
import type { Company } from "@joblane/contracts"
import CompanyLogo from "./CompanyLogo"

export default function CompanyStrip({
  companies,
}: {
  companies: Company[]
}) {
  return (
    <section className="rounded-xl border border-border bg-white p-3">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold text-slate-800">
          İşəgötürən şirkətlər
        </h2>
        <Link
          href="/companies"
          className="text-[12px] font-semibold text-brand-500 transition-colors hover:text-brand-600"
        >
          Hamısı →
        </Link>
      </div>
      <div className="relative">
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1 pr-2">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.slug}`}
              className="group flex w-[168px] shrink-0 items-center gap-2.5 rounded-xl border border-border bg-slate-50/60 py-2 pl-2 pr-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white hover:shadow-md"
            >
              <CompanyLogo name={company.name} className="h-9 w-9 shrink-0 rounded-lg text-xs" />
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold text-slate-700 group-hover:text-brand-600">
                  {company.name}
                </p>
                <p className="text-[11px] font-medium text-slate-400">
                  {company.openJobsCount} vakansiya
                </p>
              </div>
            </Link>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
      </div>
    </section>
  )
}