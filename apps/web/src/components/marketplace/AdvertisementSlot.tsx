import Link from "next/link"
import type { CSSProperties } from "react"
import {
  Check,
  Smartphone,
  BatteryCharging,
  Wifi,
  Zap,
  Plane,
  MapPin,
  Sun,
  Landmark,
  ShieldCheck,
  Car,
  GraduationCap,
  ShoppingBag,
  Utensils,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdFormat, AdIndustry, Advertisement } from "@/lib/fixtures"

const FORMAT_ASPECT: Record<AdFormat, string> = {
  "120x500": "aspect-[120/500]",
  "120x600": "aspect-[120/600]",
  "160x600": "aspect-[160/600]",
  "300x250": "aspect-[300/250]",
  "300x600": "aspect-[300/600]",
  "320x100": "aspect-[320/100]",
  "728x90": "aspect-[728/90]",
  "970x90": "aspect-[970/90]",
}

function isHorizontal(format: AdFormat) {
  return format === "970x90" || format === "728x90" || format === "320x100"
}

function isNarrow(format: AdFormat) {
  return format === "120x600" || format === "120x500"
}

function isTall(format: AdFormat) {
  return format === "120x600" || format === "160x600" || format === "120x500" || format === "300x600"
}

const BG_PRESETS: Record<string, string> = {
  blue: "bg-gradient-to-b from-brand-500 via-brand-600 to-brand-800",
  navy: "bg-gradient-to-b from-brand-800 via-[#163B75] to-[#0E2A5C]",
  teal: "bg-gradient-to-b from-teal-600 via-teal-700 to-teal-950",
  slate: "bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950",
}

const INDUSTRY_GLYPHS: Record<AdIndustry, typeof Sparkles> = {
  banking: Landmark,
  telecom: Wifi,
  electronics: Smartphone,
  travel: Plane,
  insurance: ShieldCheck,
  automotive: Car,
  education: GraduationCap,
  retail: ShoppingBag,
  food_delivery: Utensils,
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

function bgClassOf(ad: Advertisement): { className?: string; style?: CSSProperties } {
  const bg = ad.background
  if (!bg) return { className: BG_PRESETS.blue }
  if (bg in BG_PRESETS) return { className: BG_PRESETS[bg] }
  if (bg.startsWith("#") || bg.includes("gradient")) return { style: { background: bg } }
  return { className: BG_PRESETS.blue }
}

type Illustration =
  | { kind: "image"; src: string }
  | { kind: "phone" }
  | { kind: "airplane" }
  | { kind: "generic"; Icon: typeof Sparkles }

function illustrationOf(ad: Advertisement): Illustration {
  const key = ad.creativeImage
  if (key && (key.startsWith("http") || key.startsWith("data:"))) {
    return { kind: "image", src: key }
  }
  if (key === "phone") return { kind: "phone" }
  if (key === "airplane") return { kind: "airplane" }
  return { kind: "generic", Icon: INDUSTRY_GLYPHS[ad.industry] ?? Sparkles }
}

function MiniBankVisual({ compact }: { compact: boolean }) {
  if (compact) return null
  return (
    <div className="relative hidden h-12 w-28 shrink-0 sm:flex">
      <span className="absolute left-0 top-1 h-8 w-14 rounded-md border border-border bg-white shadow-sm" />
      <span className="absolute left-4 top-3 h-8 w-14 rounded-md bg-gradient-to-br from-brand-500 to-brand-800 shadow-sm">
        <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white/70" />
        <span className="absolute bottom-1.5 left-1.5 h-[3px] w-6 rounded bg-white/40" />
      </span>
      <span className="absolute right-0 top-0 h-10 w-6 rounded-[5px] border-2 border-slate-200 bg-white shadow-sm">
        <span className="absolute inset-x-1 top-1.5 h-[3px] rounded bg-brand-500/70" />
        <span className="absolute inset-x-1 top-3.5 h-[3px] rounded bg-slate-200" />
        <span className="absolute inset-x-1 top-6 h-2 rounded-full bg-slate-100" />
      </span>
    </div>
  )
}

function HorizontalCreative({ ad, className }: { ad: Advertisement; className?: string }) {
  const compact = ad.format === "320x100"
  return (
    <div
      className={cn(
        "relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-border bg-white",
        compact ? "px-4" : "px-6",
        className
      )}
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: ad.accentColor ?? "var(--color-brand-500, #1E5EFF)" }}
      />
      {!compact && (
        <>
          <span className="pointer-events-none absolute -right-14 -top-16 h-36 w-36 rounded-full bg-brand-500/[0.05]" />
          <span className="pointer-events-none absolute -bottom-16 right-28 h-28 w-28 rounded-full bg-accent-500/[0.05]" />
        </>
      )}

      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 font-bold text-white shadow-sm",
          compact ? "h-9 w-9 text-[12px]" : "h-12 w-12 text-[14px]"
        )}
      >
        {initialsOf(ad.advertiserName)}
        <span className="sr-only">{ad.advertiserName}</span>
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-bold text-slate-800", compact ? "text-[13px]" : "text-[15px]")}>
          {ad.headline}
        </p>
        {ad.description && (
          <p className={cn("truncate text-slate-500", compact ? "text-[11.5px]" : "text-[12.5px]")}>
            {ad.description}
          </p>
        )}
      </div>

      <MiniBankVisual compact={compact} />

      {!compact && <span className="h-10 w-px shrink-0 bg-border" />}

      <div className={cn("flex shrink-0 flex-col items-end", compact ? "gap-0" : "gap-1")}>
        <span
          className={cn(
            "rounded-lg bg-brand-500 font-semibold text-white shadow-sm",
            compact ? "px-3 py-1 text-[11px]" : "px-5 py-2 text-[12.5px]"
          )}
        >
          {ad.ctaLabel}
        </span>
        {!compact && (
          <span className="text-[9.5px] font-medium uppercase tracking-wide text-slate-400">
            {ad.advertiserName}
          </span>
        )}
      </div>
    </div>
  )
}

function PhoneVisual({
  narrow,
  accent,
  extended = false,
}: {
  narrow: boolean
  accent: string
  extended?: boolean
}) {
  const h = extended ? (narrow ? 220 : 260) : narrow ? 148 : 184
  const w = extended ? (narrow ? 84 : 110) : narrow ? 62 : 84
  return (
    <div className="relative flex w-full items-center justify-center" style={{ height: h }}>
      <span className="absolute h-24 w-24 rounded-full border border-white/15" />
      <span className="absolute h-36 w-36 rounded-full border border-white/10" />
      <span
        className={cn(
          "absolute left-1 top-3 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm",
          extended ? "h-6 w-6" : "h-5 w-5"
        )}
      >
        <BatteryCharging className={extended ? "h-3.5 w-3.5" : "h-3 w-3"} />
      </span>
      <span
        className={cn(
          "absolute right-0 top-9 flex items-center justify-center rounded-full backdrop-blur-sm",
          extended ? "h-6 w-6" : "h-5 w-5"
        )}
        style={{ backgroundColor: accent }}
      >
        <Wifi className={extended ? "h-3.5 w-3.5" : "h-3 w-3"} />
      </span>
      <span
        className={cn(
          "absolute bottom-7 left-1 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm",
          extended ? "h-6 w-6" : "h-5 w-5"
        )}
      >
        <Zap className={extended ? "h-3.5 w-3.5" : "h-3 w-3"} />
      </span>

      <div className="relative z-10 mt-4" style={{ width: w }}>
        <div className="rounded-[10px] border-2 border-white/40 bg-white/10 p-1.5 backdrop-blur-sm">
          <div className="space-y-1 rounded-[5px] bg-white/10 p-1.5">
            <div className={cn("h-1 rounded bg-white/60", w > 80 ? "w-16" : "w-9")} />
            <div className={cn("h-1 rounded bg-white/35", w > 80 ? "w-10" : "w-6")} />
            <div className="h-1 rounded" style={{ backgroundColor: accent }} />
          </div>
        </div>
        <div className="mx-auto mt-1 h-1 w-7 rounded-full bg-white/40" />
      </div>
    </div>
  )
}

function AirplaneVisual({
  narrow,
  accent,
  extended = false,
}: {
  narrow: boolean
  accent: string
  extended?: boolean
}) {
  const h = extended ? (narrow ? 220 : 260) : narrow ? 148 : 184
  return (
    <div className="relative flex w-full items-center justify-center" style={{ height: h }}>
      <span className="absolute h-24 w-24 rounded-full border border-white/15" />
      <span className="absolute h-36 w-36 rounded-full border border-white/10" />
      <span className="absolute h-28 w-28 rounded-full border border-dashed border-white/25" />

      <div className="relative z-10 flex flex-col items-center">
        <Plane
          className={cn("text-white", extended ? (narrow ? "h-10 w-10" : "h-12 w-12") : narrow ? "h-8 w-8" : "h-10 w-10")}
          style={{ transform: "rotate(-45deg)" }}
        />
        <span
          className="mt-2 rounded-full px-2 py-[2px] text-[8px] font-semibold uppercase tracking-wide backdrop-blur-sm"
          style={{ backgroundColor: accent }}
        >
          {narrow ? "" : "Best"}
        </span>
      </div>

      <span
        className={cn(
          "absolute right-0.5 top-8 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm",
          extended ? "h-7 w-7" : "h-6 w-6"
        )}
        style={{ color: accent }}
      >
        <MapPin className={extended ? "h-4 w-4" : "h-3.5 w-3.5"} />
      </span>
      <span
        className={cn(
          "absolute bottom-8 left-1 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm",
          extended ? "h-6 w-6" : "h-5 w-5"
        )}
      >
        <Sun className={extended ? "h-3.5 w-3.5" : "h-3 w-3"} />
      </span>
    </div>
  )
}

function GenericVisual({
  narrow,
  Icon,
  accent,
  extended = false,
}: {
  narrow: boolean
  Icon: typeof Sparkles
  accent: string
  extended?: boolean
}) {
  const h = extended ? (narrow ? 220 : 260) : narrow ? 148 : 184
  return (
    <div className="relative flex w-full items-center justify-center" style={{ height: h }}>
      <span className="absolute h-24 w-24 rounded-full border border-white/15" />
      <span className="absolute h-36 w-36 rounded-full border border-white/10" />
      <span
        className={cn(
          "absolute left-1 top-4 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm",
          extended ? "h-6 w-6" : "h-5 w-5"
        )}
      >
        <Sparkles className={extended ? "h-3.5 w-3.5" : "h-3 w-3"} />
      </span>
      <span
        className={cn(
          "absolute bottom-8 right-0.5 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm",
          extended ? "h-6 w-6" : "h-5 w-5"
        )}
        style={{ color: accent }}
      >
        <Sparkles className={extended ? "h-3.5 w-3.5" : "h-3 w-3"} />
      </span>
      <span
        className={cn(
          "relative z-10 flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 backdrop-blur-sm",
          extended ? (narrow ? "h-16 w-16" : "h-20 w-20") : "h-14 w-14"
        )}
      >
        <Icon className={cn("text-white", extended ? (narrow ? "h-8 w-8" : "h-9 w-9") : narrow ? "h-7 w-7" : "h-8 w-8")} />
      </span>
    </div>
  )
}

function Illustration({
  ad,
  narrow,
  accent,
  altText,
  extended = false,
}: {
  ad: Advertisement
  narrow: boolean
  accent: string
  altText: string
  extended?: boolean
}) {
  const ill = illustrationOf(ad)
  if (ill.kind === "image") {
    return (
      <div
        className="relative flex w-full items-center justify-center"
        style={{ height: extended ? (narrow ? 220 : 260) : narrow ? 148 : 184 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ill.src}
          alt={altText}
          className="max-h-full w-full rounded-lg object-contain"
          loading="lazy"
        />
      </div>
    )
  }
  if (ill.kind === "phone") return <PhoneVisual narrow={narrow} accent={accent} extended={extended} />
  if (ill.kind === "airplane") return <AirplaneVisual narrow={narrow} accent={accent} extended={extended} />
  return <GenericVisual narrow={narrow} Icon={ill.Icon} accent={accent} extended={extended} />
}

function TallCreative({
  ad,
  narrow,
  extended = false,
}: {
  ad: Advertisement
  narrow: boolean
  extended?: boolean
}) {
  const accent = ad.accentColor ?? "#2DD4BF"
  const bg = bgClassOf(ad)
  const x = extended ? 1 : 0
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center overflow-hidden rounded-xl text-white",
        bg.className
      )}
      style={bg.style}
    >
      <span className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-white/[0.06]" />
      <span className="pointer-events-none absolute -right-8 top-24 h-24 w-24 rounded-full bg-white/[0.07]" />
      <span className="pointer-events-none absolute -left-10 bottom-14 h-28 w-28 rounded-full bg-white/[0.05]" />
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: accent }}
      />

      <div className="relative flex w-full flex-1 flex-col items-center px-1.5 pb-2 pt-2.5 text-center">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "flex items-center justify-center rounded-md bg-white font-bold text-slate-900 shadow-sm",
              narrow ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[11px]"
            )}
          >
            {initialsOf(ad.advertiserName)}
          </span>
          <span
            className={cn(
              "font-semibold uppercase tracking-wide text-white/85",
              narrow ? (x ? "text-[9px]" : "text-[8px]") : x ? "text-[10px]" : "text-[9px]"
            )}
          >
            {ad.advertiserName}
          </span>
        </div>

        <p
          className={cn(
            "mt-2 font-bold leading-snug text-white",
            narrow ? (x ? "text-[13px]" : "text-[11.5px]") : x ? "text-[14px]" : "text-[12.5px]"
          )}
        >
          {ad.headline}
        </p>
        {ad.description && (
          <p
            className={cn(
              "mt-0.5 text-white/70",
              narrow
                ? x
                  ? "text-[9.5px] leading-snug"
                  : "text-[8.5px] leading-snug"
                : x
                  ? "text-[10.5px]"
                  : "text-[9.5px]"
            )}
          >
            {ad.description}
          </p>
        )}

        <div className="my-auto w-full">
          <Illustration
            ad={ad}
            narrow={narrow}
            accent={accent}
            altText={ad.altText ?? ad.headline}
            extended={extended}
          />
        </div>

        {ad.features && ad.features.length > 0 && (
          <ul className="w-full space-y-1">
            {ad.features.map((f) => (
              <li
                key={f}
                className={cn(
                  "flex items-center gap-1 rounded-md bg-white/[0.08] px-1.5 py-[3px] backdrop-blur-sm",
                  narrow ? (x ? "text-[9.5px]" : "text-[8.5px]") : x ? "text-[10.5px]" : "text-[9.5px]"
                )}
              >
                <Check
                  className={cn("shrink-0", narrow ? "h-2.5 w-2.5" : "h-3 w-3")}
                  style={{ color: accent }}
                />
                <span className="truncate font-medium text-white/90">{f}</span>
              </li>
            ))}
          </ul>
        )}

        <span
          className={cn(
            "mt-2 rounded-full bg-white font-bold text-slate-900 shadow-sm",
            narrow
              ? x
                ? "px-3 py-1 text-[10px]"
                : "px-2.5 py-[3px] text-[9px]"
              : x
                ? "px-4 py-1.5 text-[11px]"
                : "px-3.5 py-1 text-[10px]"
          )}
        >
          {ad.ctaLabel}
        </span>
        <span
          className={cn(
            "mt-1 uppercase tracking-[0.15em] text-white/50",
            narrow ? (x ? "text-[7.5px]" : "text-[7px]") : x ? "text-[8px]" : "text-[7.5px]"
          )}
        >
          {ad.advertiserName}
        </span>
      </div>
    </div>
  )
}

function CompactCreative({ ad, narrow }: { ad: Advertisement; narrow: boolean }) {
  const accent = ad.accentColor ?? "#2DD4BF"
  const bg = bgClassOf(ad)
  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl px-3 py-4 text-center text-white",
        bg.className
      )}
      style={bg.style}
    >
      <span className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-white/[0.07]" />
      <span className="pointer-events-none absolute -bottom-12 -left-8 h-24 w-24 rounded-full bg-white/[0.08]" />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} />

      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "flex items-center justify-center rounded-md bg-white font-bold text-slate-900",
            narrow ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[11px]"
          )}
        >
          {initialsOf(ad.advertiserName)}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-white/85">
          {ad.advertiserName}
        </span>
      </div>
      <p className={cn("mt-2 font-bold leading-snug", narrow ? "text-[11px]" : "text-[12.5px]")}>
        {ad.headline}
      </p>
      {ad.description && <p className="mt-0.5 text-[10px] text-white/70">{ad.description}</p>}
      {ad.features && ad.features.length > 0 && (
        <ul className="mt-2 w-full space-y-1">
          {ad.features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-1 rounded-md bg-white/[0.08] px-1.5 py-[3px] text-[9.5px] backdrop-blur-sm"
            >
              <Check className="h-2.5 w-2.5 shrink-0" style={{ color: accent }} />
              <span className="truncate font-medium text-white/90">{f}</span>
            </li>
          ))}
        </ul>
      )}
      <span
        className={cn(
          "mt-3 rounded-full bg-white font-bold text-slate-900 shadow-sm",
          narrow ? "px-3 py-1 text-[9.5px]" : "px-4 py-1.5 text-[10.5px]"
        )}
      >
        {ad.ctaLabel}
      </span>
      <span className="mt-2 text-[8px] uppercase tracking-[0.15em] text-white/50">{ad.advertiserName}</span>
    </div>
  )
}

function VerticalCreative({
  ad,
  className,
  fullHeight = false,
}: {
  ad: Advertisement
  className?: string
  fullHeight?: boolean
}) {
  const narrow = isNarrow(ad.format)
  const body = isTall(ad.format) ? (
    <TallCreative ad={ad} narrow={narrow} extended={fullHeight} />
  ) : (
    <CompactCreative ad={ad} narrow={narrow} />
  )
  return <div className={cn("flex w-full flex-col", className)}>{body}</div>
}

export default function AdvertisementSlot({
  ad,
  label = "REKLAM",
  className,
  compact = false,
  fullHeight = false,
}: {
  ad: Advertisement
  label?: string
  className?: string
  compact?: boolean
  fullHeight?: boolean
}) {
  const body = isHorizontal(ad.format) ? (
    <HorizontalCreative ad={ad} className={FORMAT_ASPECT[ad.format]} />
  ) : (
    <VerticalCreative
      ad={ad}
      fullHeight={fullHeight}
      className={fullHeight ? "flex-1" : FORMAT_ASPECT[ad.format]}
    />
  )

  return (
    <div
      className={cn(
        "flex flex-col",
        fullHeight ? "h-[calc(100vh-73px)]" : "",
        className
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-slate-300">
          {label}
        </span>
        <span className="h-px flex-1 bg-slate-100" />
        <span className="text-[8.5px] font-medium text-slate-300">{ad.format}</span>
      </div>
      {ad.href ? (
        <Link
          href={ad.href}
          className={cn("group", fullHeight ? "flex min-h-0 flex-1 flex-col" : "block")}
          title={ad.headline}
          aria-label={ad.altText ?? ad.headline}
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  )
}
