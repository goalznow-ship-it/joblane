// Development fixtures for advertisement slots
// These are DEVELOPMENT FIXTURES - replace with real ad server data when available

export type AdPlacement =
  | "top_leaderboard"
  | "left_rail"
  | "right_rail"
  | "sidebar_rectangle"
  | "inline_feed"

export type AdFormat =
  | "120x500"
  | "120x600"
  | "160x600"
  | "300x250"
  | "300x600"
  | "320x100"
  | "728x90"
  | "970x90"

export type AdIndustry =
  | "banking"
  | "telecom"
  | "electronics"
  | "travel"
  | "insurance"
  | "automotive"
  | "education"
  | "retail"
  | "food_delivery"

export type AdRailSide = "left" | "right"

export interface Advertisement {
  id: string
  placement: AdPlacement
  format: AdFormat
  industry: AdIndustry
  advertiserName: string
  headline: string
  description?: string
  features?: string[]
  ctaLabel: string
  href?: string
  // "phone" | "airplane" = built-in CSS illustration key;
  // any http(s)/data: URL = uploaded banner image (future ad server)
  creativeImage?: string
  // preset key ("blue" | "navy" | "teal" | "slate") or raw CSS background value
  background?: string
  accentColor?: string
  altText?: string
  railSide?: AdRailSide
  sequence?: number
  // future ad-server fields (frontend ready, not yet driven by a backend)
  startDate?: string
  endDate?: string
  active: boolean
}

export const advertisements: Advertisement[] = [
  // ---- TOP LEADERBOARD (demo: banking advertiser) ----
  {
    id: 'ad-top-970',
    placement: 'top_leaderboard',
    format: '970x90',
    industry: 'banking',
    advertiserName: 'Kapital Bank',
    headline: 'Kreditlərə xüsusi şərtlər',
    description: 'Onlayn müraciət — tez baxış, rahat şərtlər',
    ctaLabel: 'Müraciət et',
    href: 'https://example.com/kapital-bank',
    creativeImage: 'bank',
    background: 'navy',
    accentColor: '#F59E0B',
    altText: 'Kapital Bank reklamı',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },  {
    id: 'ad-top-320',
    placement: 'top_leaderboard',
    format: '320x100',
    industry: 'banking',
    advertiserName: 'Kapital Bank',
    headline: 'Kreditlərə xüsusi şərtlər',
    description: 'Onlayn müraciət — tez baxış',
    ctaLabel: 'Müraciət et',
    href: 'https://example.com/kapital-bank',
    creativeImage: 'bank',
    background: 'navy',
    accentColor: '#F59E0B',
    altText: 'Kapital Bank reklamı',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },
  // ---- LEFT OUTER RAIL (demo sequence: 4 unrelated advertisers) ----
  {
    id: 'ad-left-1',
    sequence: 1,
    industry: 'electronics',
    advertiserName: 'Nova Mobile',
    headline: 'Yeni nəsil texnologiya',
    description: 'Smartfon və aksesuarları sərfəli qiymətlərlə kəşf et',
    features: ['Yeni modellər', 'Rəsmi zəmanət', 'Sürətli çatdırılma'],
    ctaLabel: 'Məhsullara bax',
    href: 'https://example.com/nova-mobile',
    creativeImage: 'phone',
    background: 'navy',
    accentColor: '#2DD4BF',
    altText: 'Nova Mobile smartfon reklamı',
    placement: 'left_rail',
    railSide: 'left',
    format: '120x600',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },  {
    id: 'ad-left-2',
    sequence: 2,
    industry: 'insurance',
    advertiserName: 'Caspian Insurance',
    headline: 'Hərtərəfli sığorta təklifləri',
    description: 'Kasko, OMS və əmlak üzrə əlverişli şərtlər',
    features: ['Sürətli ödəniş', '24/7 yardım'],
    ctaLabel: 'Qiymət al',
    href: 'https://example.com/caspian-insurance',
    creativeImage: 'generic',
    background: 'blue',
    accentColor: '#FBBF24',
    altText: 'Caspian Insurance reklamı',
    placement: 'left_rail',
    railSide: 'left',
    format: '120x600',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },  {
    id: 'ad-left-3',
    sequence: 3,
    industry: 'retail',
    advertiserName: 'City Market',
    headline: 'Həftəlik endirimlər başladı',
    description: 'Seçilmiş məhsullara 30%-ə qədər',
    features: ['Təzə məhsullar', 'Bütün mağazalarda'],
    ctaLabel: 'Mağazaya bax',
    href: 'https://example.com/city-market',
    creativeImage: 'generic',
    background: 'slate',
    accentColor: '#F87171',
    altText: 'City Market reklamı',
    placement: 'left_rail',
    railSide: 'left',
    format: '120x600',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },  {
    id: 'ad-left-4',
    sequence: 4,
    industry: 'automotive',
    advertiserName: 'AutoHub',
    headline: 'Yeni avtomobilə kredit',
    description: '0% ilkin ödəniş, 3 illik zəmanət',
    features: ['Test sürüşü', 'Dəyişmə imkanı'],
    ctaLabel: 'Kataloqa bax',
    href: 'https://example.com/autohub',
    creativeImage: 'generic',
    background: 'teal',
    accentColor: '#38BDF8',
    altText: 'AutoHub reklamı',
    placement: 'left_rail',
    railSide: 'left',
    format: '120x600',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },
  // ---- RIGHT OUTER RAIL (demo sequence: 4 unrelated advertisers) ----
  {
    id: 'ad-right-1',
    sequence: 1,
    industry: 'travel',
    advertiserName: 'Caspian Travel',
    headline: 'Növbəti səfərini planla',
    description: 'Seçilmiş istiqamətlərə xüsusi təkliflər',
    features: ['Sərfəli paketlər', 'Otel seçimləri', '24/7 dəstək'],
    ctaLabel: 'Təkliflərə bax',
    href: 'https://example.com/caspian-travel',
    creativeImage: 'airplane',
    background: 'teal',
    accentColor: '#FBBF24',
    altText: 'Caspian Travel səyahət reklamı',
    placement: 'right_rail',
    railSide: 'right',
    format: '120x600',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },  {
    id: 'ad-right-2',
    sequence: 2,
    industry: 'banking',
    advertiserName: 'Azerfin Bank',
    headline: 'Kreditlərə xüsusi şərtlər',
    description: 'Onlayn müraciət — tez baxış',
    features: ['Aşağı faizlər', 'Onlayn müraciət'],
    ctaLabel: 'Müraciət et',
    href: 'https://example.com/azerfin-bank',
    creativeImage: 'generic',
    background: 'navy',
    accentColor: '#F59E0B',
    altText: 'Azerfin Bank reklamı',
    placement: 'right_rail',
    railSide: 'right',
    format: '120x600',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },  {
    id: 'ad-right-3',
    sequence: 3,
    industry: 'telecom',
    advertiserName: 'FiberLine',
    headline: 'Gigabit sürətli internet',
    description: 'Ev və ofis üçün fiber paketlər',
    features: ['Limitsiz trafik', '1 günə qoşulma'],
    ctaLabel: 'Paketlərə bax',
    href: 'https://example.com/fiberline',
    creativeImage: 'generic',
    background: 'blue',
    accentColor: '#2DD4BF',
    altText: 'FiberLine internet reklamı',
    placement: 'right_rail',
    railSide: 'right',
    format: '120x600',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },  {
    id: 'ad-right-4',
    sequence: 4,
    industry: 'food_delivery',
    advertiserName: 'FoodGo',
    headline: '30 dəqiqəyə çatdırılma',
    description: 'Pulsuz çatdırılma ilk sifarişdə',
    features: ['Pulsuz çatdırılma', 'Loyallıq kartı'],
    ctaLabel: 'Sifariş et',
    href: 'https://example.com/foodgo',
    creativeImage: 'generic',
    background: 'slate',
    accentColor: '#F59E0B',
    altText: 'FoodGo reklamı',
    placement: 'right_rail',
    railSide: 'right',
    format: '120x600',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },
  // ---- RIGHT INTERNAL SIDEBAR (demo: insurance advertiser) ----
  {
    id: 'ad-sidebar-300',
    placement: 'sidebar_rectangle',
    format: '300x250',
    industry: 'insurance',
    advertiserName: 'Qala Sigorta',
    headline: 'Avtomobilini bu gün sığortala',
    description: 'Güzəştli Kasko və OMS paketləri',
    features: ['Sürətli ödəniş', '24/7 yardım'],
    ctaLabel: 'Qiymət al',
    href: 'https://example.com/qala-sigorta',
    creativeImage: 'generic',
    background: 'blue',
    accentColor: '#2DD4BF',
    altText: 'Qala Sigorta reklamı',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },
  // ---- INLINE FEED (demo: telecom advertiser) ----
  {
    id: 'ad-inline-728',
    placement: 'inline_feed',
    format: '728x90',
    industry: 'telecom',
    advertiserName: 'Azertel',
    headline: 'Limitsiz internet paketləri',
    description: 'Yüksək sürət. Sabit qiymət.',
    ctaLabel: 'Paketlərə bax',
    href: 'https://example.com/azertel',
    creativeImage: 'generic',
    background: 'blue',
    accentColor: '#2DD4BF',
    altText: 'Azertel internet reklamı',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },]

// Demo catalog across industries - prepared for future slots, NOT rendered anywhere.
export const demoCatalog: Advertisement[] = [
  {
    id: 'demo-education',
    placement: 'sidebar_rectangle',
    format: '300x250',
    industry: 'education',
    advertiserName: 'Nexus Academy',
    headline: 'Dil kurslarına yazıl',
    description: 'Beynəlxalq sertifikat proqramları',
    features: ['Rahat cədvəl', 'Təcrübəli müəllimlər'],
    ctaLabel: 'Qeydiyyatdan keç',
    href: 'https://example.com/nexus-academy',
    creativeImage: 'generic',
    background: 'slate',
    accentColor: '#38BDF8',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },  {
    id: 'demo-automotive',
    placement: 'inline_feed',
    format: '728x90',
    industry: 'automotive',
    advertiserName: 'Auto City',
    headline: 'Yeni avtomobillərə kredit',
    description: '0% ilkin ödəniş, 3 illik zəmanət',
    ctaLabel: 'Test sürüşü',
    href: 'https://example.com/auto-city',
    creativeImage: 'generic',
    background: 'slate',
    accentColor: '#F87171',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },  {
    id: 'demo-retail',
    placement: 'inline_feed',
    format: '728x90',
    industry: 'retail',
    advertiserName: 'Mega Store',
    headline: 'Yay endirimləri başladı',
    description: 'Seçilmiş məhsullara -30%',
    ctaLabel: 'Mağazaya bax',
    href: 'https://example.com/mega-store',
    creativeImage: 'generic',
    background: 'navy',
    accentColor: '#FBBF24',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },  {
    id: 'demo-food',
    placement: 'sidebar_rectangle',
    format: '300x250',
    industry: 'food_delivery',
    advertiserName: 'Turbo Delivery',
    headline: '30 dəqiqəyə çatdırılma',
    description: 'Pulsuz çatdırılma ilk 3 sifarişdə',
    features: ['Pulsuz çatdırılma', 'Loyallıq kartı'],
    ctaLabel: 'Sifariş et',
    href: 'https://example.com/turbo-delivery',
    creativeImage: 'generic',
    background: 'teal',
    accentColor: '#F59E0B',
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    active: true,
  },]

export function getAdsByPlacement(
  placement: AdPlacement,
  ads: Advertisement[] = advertisements
): Advertisement[] {
  return ads.filter((ad) => ad.placement === placement && ad.active)
}

export function cloneAdForFormat(ad: Advertisement, format: AdFormat): Advertisement {
  return { ...ad, format }
}
