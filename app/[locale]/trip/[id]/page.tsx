import type { Metadata } from "next"
import { SavedTripView } from "@/components/trips/saved-trip-view"
import { createClient } from "@/lib/supabase/server"
import { isItinerary } from "@/lib/trips"
import { isLocale } from "@/lib/i18n"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale: localeParam, id } = await params
  const locale = isLocale(localeParam) ? localeParam : "en"
  const fallback = locale === "it"
    ? { title: "Itinerario condiviso", description: "Apri questo itinerario PackrOn condiviso." }
    : { title: "Shared trip", description: "Open this shared PackrOn itinerary." }
  let title = fallback.title
  let description = fallback.description

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .rpc("get_public_trip", { p_trip_id: id })
      .maybeSingle()
    if (error) throw error
    const itinerary = (data as { data?: unknown } | null)?.data
    if (!isItinerary(itinerary)) throw new Error(`Trip ${id} was not found`)
    title = itinerary.title.trim() || fallback.title
    description = itinerary.subtitle?.trim() || fallback.description
  } catch (error) {
    console.error("[trip metadata] Failed to load public trip:", error)
  }

  const pageUrl = `/${locale}/trip/${id}`
  const imageUrl = `${pageUrl}/opengraph-image`
  const image = { url: imageUrl, width: 1200, height: 630, alt: title }

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: "website",
      siteName: "PackrOn",
      url: pageUrl,
      title,
      description,
      locale: locale === "it" ? "it_IT" : "en_US",
      alternateLocale: locale === "it" ? ["en_US"] : ["it_IT"],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SavedTripView tripId={id} publicView />
}