import Link from "next/link"
import { TrendingUp, ArrowRight } from "lucide-react"
import type { Category } from "@joblane/contracts"

export default function TrendingCategories({
  categories,
}: {
  categories: Category[]
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
          <TrendingUp className="h-4 w-4 text-brand-500" />
          Trend kateqoriyalar
        </h2>
        <Link
          href="/categories"
          className="flex items-center gap-0.5 text-[11.5px] font-semibold text-brand-500 transition-colors hover:text-brand-600"
        >
          Hamısına bax
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="space-y-0.5">
        {categories.map((cat) => (
          <li key={cat.id}>
            <Link
              href={`/categories/${cat.slug}`}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-brand-50/60"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300 transition-colors group-hover:bg-brand-500" />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-600 group-hover:text-brand-600">
                {cat.name}
              </span>
              <span className="shrink-0 text-[11.5px] font-semibold text-slate-400">
                {cat.jobsCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}