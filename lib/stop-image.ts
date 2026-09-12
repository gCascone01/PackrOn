import type { Locale } from "./i18n"

export type StopImage = {
  url: string
  title: string
  pageUrl: string
}

type WikiPage = {
  index?: number
  title?: string
  thumbnail?: { source?: string }
  fullurl?: string
}

const THUMB_SIZE = 800
const FETCH_TIMEOUT_MS = 6000
const USER_AGENT = "PackrOn/1.0 (https://packron.vercel.app; travel itinerary app)"

function wikiHost(locale: Locale): string {
  return locale === "it" ? "it.wikipedia.org" : "en.wikipedia.org"
}

function canonicalPageUrl(host: string, title: string): string {
  return `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
}

/** Pure selector: picks the best (closest / most relevant) page that has a thumbnail. Tested in `stop-image.test.ts`. */
export function pickStopImagePage(
  pages: Record<string, WikiPage> | undefined,
  host: string,
): StopImage | null {
  if (!pages) return null
  const sorted = Object.values(pages).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  for (const page of sorted) {
    const url = page.thumbnail?.source
    const title = page.title
    if (!url || !title) continue
    return { url, title, pageUrl: page.fullurl || canonicalPageUrl(host, title) }
  }
  return null
}

async function queryWikipedia(url: string, host: string): Promise<StopImage | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { query?: { pages?: Record<string, WikiPage> } }
    return pickStopImagePage(data.query?.pages, host)
  } catch {
    return null
  }
}

function geoSearchUrl(host: string, lat: number, lng: number): string {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "geosearch",
    ggscoord: `${lat}|${lng}`,
    ggsradius: "2000",
    ggslimit: "10",
    prop: "pageimages|info",
    pithumbsize: String(THUMB_SIZE),
    inprop: "url",
  })
  return `https://${host}/w/api.php?${params.toString()}`
}

function textSearchUrl(host: string, name: string): string {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: name,
    gsrlimit: "5",
    gsrnamespace: "0",
    prop: "pageimages|info",
    pithumbsize: String(THUMB_SIZE),
    inprop: "url",
  })
  return `https://${host}/w/api.php?${params.toString()}`
}

/**
 * Fetches a freely-licensed photo for a stop from Wikipedia page images.
 * Tries coordinate search on the locale wiki first, then English Wikipedia,
 * then a text search by stop name. Never throws — returns null when no
 * image is found or the request fails, so callers can omit the image.
 */
export async function fetchStopImage(
  name: string,
  lat: number,
  lng: number,
  locale: Locale,
): Promise<StopImage | null> {
  const hosts = locale === "it" ? [wikiHost("it"), wikiHost("en")] : [wikiHost("en")]
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)

  if (hasCoords) {
    for (const host of hosts) {
      const image = await queryWikipedia(geoSearchUrl(host, lat, lng), host)
      if (image) return image
    }
  }

  const query = name.trim()
  if (query) {
    for (const host of hosts) {
      const image = await queryWikipedia(textSearchUrl(host, query), host)
      if (image) return image
    }
  }

  return null
}
