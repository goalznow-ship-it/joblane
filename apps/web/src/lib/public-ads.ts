import { AdFormat, AdPlacement, AdIndustry, Advertisement } from "./fixtures"

const PUBLIC_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

interface PublicAdOut {
  id: string
  advertiser_name: string
  campaign_name: string
  headline?: string
  description?: string
  cta_label?: string
  destination_url?: string
  alt_text?: string
  format: string
  creative_image_url?: string
  mobile_image_url?: string
  background?: string
  accent_color?: string
}

interface PublicAdsResponse {
  items: PublicAdOut[]
}

function mapPublicAdToFixture(ad: PublicAdOut): Advertisement {
  return {
    id: ad.id,
    placement: ad.format === "970x90" || ad.format === "728x90" || ad.format === "320x100"
      ? "top_leaderboard"
      : ad.format === "120x600" || ad.format === "160x600"
        ? "left_rail"
        : ad.format === "300x250"
          ? "sidebar_rectangle"
          : "inline_feed",
    format: ad.format as AdFormat,
    industry: (ad.background?.includes("navy") ? "banking" : "telecom") as AdIndustry,
    advertiserName: ad.advertiser_name,
    headline: ad.headline || "",
    description: ad.description,
    features: ad.cta_label ? [ad.cta_label] : undefined,
    ctaLabel: ad.cta_label || "Ətraflı",
    href: ad.destination_url,
    creativeImage: ad.creative_image_url || "phone",
    background: ad.background || "blue",
    accentColor: ad.accent_color || "#2DD4BF",
    altText: ad.alt_text,
    railSide: ad.format === "120x600" || ad.format === "160x600" ? "left" : "right",
    sequence: 0,
    startDate: undefined,
    endDate: undefined,
    active: true,
  }
}

export async function getActiveAdsByPlacement(
  placement: "top_leaderboard" | "left_rail" | "right_rail" | "sidebar_rectangle" | "inline_feed",
  limit: number = 1
): Promise<Advertisement[]> {
  try {
    const apiPlacement = placement === "top_leaderboard" ? "TOP_LEADERBOARD"
      : placement === "left_rail" ? "LEFT_SKIN"
      : placement === "right_rail" ? "RIGHT_SKIN"
      : placement === "sidebar_rectangle" ? "RIGHT_SIDEBAR"
      : "INLINE_FEED"

    const res = await fetch(
      `${PUBLIC_API_BASE}/api/v1/admin/public/ads/active?placement=${apiPlacement}&limit=${limit}`,
      {
        next: { revalidate: 60 },
        headers: { "Content-Type": "application/json" },
      }
    )

    if (!res.ok) {
      console.warn(`Public ads API returned ${res.status} for ${placement}`)
      return []
    }

    const data: PublicAdsResponse = await res.json()
    return data.items.map(mapPublicAdToFixture)
  } catch (error) {
    console.warn(`Failed to fetch public ads for ${placement}:`, error)
    return []
  }
}

export async function getTopLeaderboardAds(limit = 2): Promise<Advertisement[]> {
  return getActiveAdsByPlacement("top_leaderboard", limit)
}

export async function getLeftSkinAds(limit = 4): Promise<Advertisement[]> {
  return getActiveAdsByPlacement("left_rail", limit)
}

export async function getRightSkinAds(limit = 4): Promise<Advertisement[]> {
  return getActiveAdsByPlacement("right_rail", limit)
}

export async function getSidebarRectangleAd(): Promise<Advertisement | null> {
  const ads = await getActiveAdsByPlacement("sidebar_rectangle", 1)
  return ads[0] || null
}

export async function getInlineFeedAd(): Promise<Advertisement | null> {
  const ads = await getActiveAdsByPlacement("inline_feed", 1)
  return ads[0] || null
}