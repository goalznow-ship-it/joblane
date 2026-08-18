"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Check,
  Plane,
  MapPin,
  Star,
  Package,
  Truck,
  Building2,
  Headphones,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { advertisements } from "@/lib/fixtures"

const CONTINUATION_MIN = 520

function NovaDeco() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(closest-side,rgba(45,212,191,0.22),transparent)]" style={{ inset: "10% 0 auto 0", height: "16%" }} />
      <div className="absolute inset-0 bg-[radial-gradient(closest-side,rgba(45,212,191,0.12),transparent)]" style={{ top: "46%", height: "22%" }} />
      <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)]" style={{ backgroundSize: "14px 14px" }} />
      <div className="absolute left-[-20px] top-[18%] h-28 w-28 rounded-full border border-cyan-300/20" />
      <div className="absolute right-[-24px] top-[52%] h-32 w-32 rounded-full border border-cyan-300/15" />
      <div className="absolute left-[-18px] bottom-[24%] h-24 w-24 rounded-full border border-cyan-300/10" />
    </>
  )
}

function TravelDeco() {
  return (
    <>
      <div className="absolute inset-x-0 top-[8%] h-20 bg-[radial-gradient(closest-side,rgba(251,191,36,0.35),transparent)]" />
      <div className="absolute left-[12%] top-[22%] h-6 w-14 rounded-full bg-white/10 blur-[6px]" />
      <div className="absolute right-[8%] top-[34%] h-5 w-10 rounded-full bg-white/10 blur-[6px]" />
      <div className="absolute left-[18%] top-[58%] h-6 w-12 rounded-full bg-white/8 blur-[6px]" />
      <div className="absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-b from-[#0A4658]/0 to-[#052E3B]" />
      <div className="absolute inset-x-[-10%] bottom-[6%] h-4 rounded-[50%] bg-emerald-400/25" />
      <div className="absolute right-[10%] bottom-[10%] h-3 w-8 rounded-[50%] bg-emerald-400/20" />
      <div className="absolute left-[6%] bottom-[13%] h-3 w-9 rounded-[50%] bg-emerald-400/20" />
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)]" style={{ backgroundSize: "14px 14px" }} />
    </>
  )
}

function PhoneVisual({ accent }: { accent: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative h-20 w-11 overflow-hidden rounded-lg border border-white/70 bg-white/5 shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
        <div className="mx-auto mt-1 h-0.5 w-4 rounded-full bg-white/40" />
        <div
          className="absolute inset-x-1 top-2.5 bottom-1 rounded-md bg-gradient-to-b from-white/15 to-transparent"
          style={{ background: `linear-gradient(160deg, ${accent}55, #0B1529)` }}
        >
          <div className="mx-auto mt-1.5 h-1 w-1 rounded-full" style={{ background: accent }} />
          <div className="mx-1 mt-1 h-1.5 rounded-sm bg-white/25" />
          <div className="mx-1 mt-0.5 h-1.5 rounded-sm bg-white/15" />
          <div className="mx-1 mt-0.5 h-1.5 rounded-sm bg-white/10" />
        </div>
      </div>
      <div className="absolute top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.35),transparent)]" />
    </div>
  )
}

function PlaneVisual({ accent }: { accent: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute h-16 w-16 rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,0.35),transparent)]" />
      <div className="absolute h-10 w-10 rounded-full border border-white/25" />
      <div className="absolute h-7 w-7 rounded-full border border-white/15" />
      <Plane className="relative z-10 h-9 w-9 -rotate-45 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]" style={{ color: accent }} />
    </div>
  )
}

function SkinHero({
  advertiserName,
  logo,
  headline,
  description,
  features,
  ctaLabel,
  href,
  visual,
  accent,
  base,
}: {
  advertiserName: string
  logo: string
  headline: string
  description: string
  features: string[]
  ctaLabel: string
  href?: string
  visual: "phone" | "airplane"
  accent: string
  base: string
}) {
  return (
    <div className="relative flex h-[calc(100vh-73px)] w-full flex-col items-center px-1 pt-2">
      <div className="flex items-center gap-1">
        <span
          className="flex h-4 w-4 items-center justify-center rounded-[4px] text-[7.5px] font-black"
          style={{ background: accent, color: base }}
        >
          {logo}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/90">
          {advertiserName}
        </span>
      </div>
      <p className="mt-2 text-center text-[9.5px] font-extrabold leading-[1.25] text-white">
        {headline}
      </p>
      <p className="mt-1 text-center text-[7.5px] leading-[1.4] text-white/60">{description}</p>

      <div className="my-auto flex w-full flex-col items-center py-2">
        {visual === "phone" ? <PhoneVisual accent={accent} /> : <PlaneVisual accent={accent} />}
      </div>

      <div className="flex w-full flex-col gap-1">
        {features.map((f) => (
          <span key={f} className="flex items-center gap-1 text-[7.5px] font-semibold text-white/80">
            <Check className="h-2.5 w-2.5 shrink-0" style={{ color: accent }} />
            {f}
          </span>
        ))}
      </div>

      {href ? (
        <Link
          href={href}
          className="mt-2 rounded-full px-2 py-1 text-[7.5px] font-black uppercase tracking-wider text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-transform duration-150 hover:scale-[1.04]"
          style={{ background: accent, color: base }}
        >
          {ctaLabel}
        </Link>
      ) : (
        <span
          className="mt-2 rounded-full px-2 py-1 text-[7.5px] font-black uppercase tracking-wider"
          style={{ background: accent, color: base }}
        >
          {ctaLabel}
        </span>
      )}

      <p className="mt-1.5 text-[6.5px] font-bold uppercase tracking-[0.28em] text-white/50">
        {advertiserName}
      </p>
    </div>
  )
}

function Continuation({ ad, i }: { ad: (typeof advertisements)[number]; i: number }) {
  const accent = ad.accentColor ?? "#ffffff"
  const travel = ad.industry === "travel"
  const templates = travel
    ? [
        {
          title: "İstiqamətlər",
          caption: "Türkiyə • BƏƏ • Mərakeş",
          node: (
            <div className="relative flex h-10 w-10 items-center justify-center">
              <MapPin className="h-6 w-6" style={{ color: accent }} />
              <span className="absolute h-7 w-7 rounded-full border border-white/20" />
            </div>
          ),
        },
        {
          title: "Otel seçimləri",
          caption: "4 ulduzdan 5 ulduza",
          node: (
            <div className="relative flex h-10 w-10 items-center justify-center">
              <Building2 className="h-6 w-6 text-white/90" />
              <span className="absolute h-8 w-8 rounded-full border border-white/15" />
            </div>
          ),
        },
        {
          title: "Sərfəli paketlər",
          caption: "Avia + otel birlikdə",
          node: (
            <div className="relative flex h-10 w-10 items-center justify-center">
              <Star className="h-6 w-6" style={{ color: accent }} />
              <Plane className="absolute -right-1 -top-1 h-3 w-3 -rotate-45 text-white/70" />
            </div>
          ),
        },
      ]
    : [
        {
          title: "Yeni modellər",
          caption: "Sentyabr kolleksiyası",
          node: (
            <div className="relative flex items-end">
              <div className="h-8 w-4 rounded border border-white/40 bg-white/5" />
              <div className="relative z-10 -ml-0.5 h-10 w-5 rounded border-2 border-white/80 bg-white/10">
                <span className="mx-auto mt-0.5 block h-0.5 w-2 rounded-full bg-white/40" />
              </div>
              <div className="-ml-0.5 h-8 w-4 rounded border border-white/40 bg-white/5" />
            </div>
          ),
        },
        {
          title: "Aksesuarlar",
          caption: "Qulaqlıq • Qoruyucu • Enerji",
          node: (
            <div className="relative flex h-10 w-10 items-center justify-center">
              <Headphones className="h-6 w-6 text-white/90" />
              <span className="absolute h-8 w-8 rounded-full border border-white/15" />
            </div>
          ),
        },
        {
          title: "Sürətli çatdırılma",
          caption: "Bakıda 24 saat ərzində",
          node: (
            <div className="relative flex h-10 w-10 items-center justify-center">
              <Truck className="h-6 w-6 text-white/90" />
              <Package className="absolute -right-1 bottom-0 h-3 w-3" style={{ color: accent }} />
            </div>
          ),
        },
      ]
  const t = templates[i % templates.length]
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-1">
      <p className="text-[7.5px] font-bold uppercase tracking-[0.22em] text-white/70">{t.title}</p>
      {t.node}
      <p className="text-center text-[6.5px] text-white/45">{t.caption}</p>
    </div>
  )
}

export default function SideSkin({ side }: { side: "left" | "right" }) {
  const asideRef = useRef<HTMLDivElement>(null)
  const [sections, setSections] = useState(2)

  useLayoutEffect(() => {
    const el = asideRef.current
    if (!el) return
    const compute = () => {
      const h = el.clientHeight
      if (h > 0) {
        const vh = window.innerHeight || 900
        const hero = vh - 73
        const rest = Math.max(0, h - 6 - 18 - hero)
        const n = Math.max(1, Math.ceil(rest / CONTINUATION_MIN))
        setSections((prev) => (prev === n ? prev : n))
      }
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    window.addEventListener("resize", compute)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", compute)
    }
  }, [])

  const ad = useMemo(
    () =>
      advertisements
        .filter((a) => a.railSide === side && a.active)
        .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))[0],
    [side]
  )

  if (!ad) return null

  const travel = ad.industry === "travel"
  const base = travel ? "#0A3B4A" : "#0E1B33"
  const accent = ad.accentColor ?? "#ffffff"
  const logo = (ad.advertiserName ?? "AD")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside
      ref={asideRef}
      aria-label={side === "left" ? "Sol reklam zolağı" : "Sağ reklam zolağı"}
      className={cn(
        "relative hidden w-full overflow-hidden bg-[#EEF2F9] min-[1400px]:flex",
        side === "left" ? "border-r border-border/60" : "border-l border-border/60"
      )}
    >
      <div className="absolute inset-0 flex flex-col items-center px-1 pb-4 pt-1.5">
        <div className="mb-1 flex w-full items-center gap-2">
          <span className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Reklam
          </span>
          <span className="h-px flex-1 bg-slate-200/80" />
        </div>

        <div
          className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          style={{
            background: travel
              ? "linear-gradient(180deg, #0C4A5E 0%, #0E5A72 22%, #0A4658 48%, #0E5A72 74%, #08303E 100%)"
              : "linear-gradient(180deg, #0E1B33 0%, #12264A 26%, #0E1B33 52%, #142B52 78%, #0B1529 100%)",
          }}
        >
          {travel ? <TravelDeco /> : <NovaDeco />}

          <SkinHero
            advertiserName={ad.advertiserName}
            logo={logo}
            headline={ad.headline}
            description={ad.description}
            features={ad.features ?? []}
            ctaLabel={ad.ctaLabel}
            href={ad.href}
            visual={travel ? "airplane" : "phone"}
            accent={accent}
            base={base}
          />

          {Array.from({ length: sections }, (_, i) => (
            <Continuation key={`${side}-c-${i}`} ad={ad} i={i} />
          ))}

          {travel && (
            <div className="relative z-10 mt-auto flex items-center justify-center gap-1 pb-1.5">
              <span className="h-1 w-1 rounded-full bg-amber-300/80" />
              <span className="text-[6.5px] font-bold uppercase tracking-[0.26em] text-white/55">
                Caspian Travel
              </span>
              <span className="h-1 w-1 rounded-full bg-amber-300/80" />
            </div>
          )}
          {!travel && (
            <div className="relative z-10 mt-auto flex items-center justify-center gap-1 pb-1.5">
              <span className="h-1 w-1 rounded-full" style={{ background: accent }} />
              <span className="text-[6.5px] font-bold uppercase tracking-[0.26em] text-white/55">
                Nova Mobile
              </span>
              <span className="h-1 w-1 rounded-full" style={{ background: accent }} />
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}