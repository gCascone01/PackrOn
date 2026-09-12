import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isLocale, LOCALES, type Locale } from "@/lib/i18n"

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

const LOCALE_META: Record<Locale, { title: string; description: string; ogLocale: string }> = {
  en: {
    title: "PackrOn — AI-powered Travel Planner",
    description:
      "Plan road trips and city trips with smart itineraries, interactive maps, editable timelines, and fuel/toll cost estimates.",
    ogLocale: "en_US",
  },
  it: {
    title: "PackrOn — Pianificatore di viaggi AI",
    description:
      "Pianifica road trip e city trip con itinerari intelligenti, mappe interattive, timeline modificabili e stime di carburante e pedaggi.",
    ogLocale: "it_IT",
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const meta = LOCALE_META[locale]
  // NOTE: Next.js merges `openGraph`/`twitter` shallowly — a partial object
  // here would wipe the images/siteName/type set in the root layout, so the
  // full objects (including the shared social image) are repeated per locale.
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        it: "/it",
        "x-default": "/en",
      },
    },
    openGraph: {
      type: "website",
      siteName: "PackrOn",
      url: `/${locale}`,
      title: meta.title,
      description: meta.description,
      locale: meta.ogLocale,
      alternateLocale: locale === "en" ? ["it_IT"] : ["en_US"],
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: meta.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: ["/og-image.png"],
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return children
}
