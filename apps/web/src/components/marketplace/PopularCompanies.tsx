import Link from "next/link"
import type { Company } from "@joblane/contracts"
import CompanyLogo from "./CompanyLogo"

export default function PopularCompanies({
  companies,
}: {
  companies: Company[]
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <h2 className="mb-3 text-[13px] font-semibold text-slate-800">
        Populyar şirkətlər
      </h2>
      <ul className="space-y-1">
        {companies.map((company) => (
          <li key={company.id}>
            <Link
              href={`/companies/${company.slug}`}
              className="group flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-slate-50"
            >
              <CompanyLogo
                name={company.name}
                className="h-7 w-7 rounded-md text-[10px]"
              />
              <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700 group-hover:text-brand-600">
                {company.name}
              </span>
              <span className="text-[12px] font-medium text-slate-400">
                {company.openJobsCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}