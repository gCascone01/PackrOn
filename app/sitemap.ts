import type { MetadataRoute } from 'next'
import { LOCALES } from '@/lib/i18n'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://packron.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  // Public pages only. Private routes (/*/trips, /auth/*) and shared
  // itineraries (/*/i/*) are excluded — they must never be indexed.
  // /login + /signup are public auth entry points (lower priority).
  // Each URL carries xhtml hreflang alternates (en/it/x-default) so Google
  // serves the right locale — mirrors the hreflang link tags in metadata.
  const pages = ['', '/how-it-works', '/examples', '/login', '/signup']
  return LOCALES.flatMap((locale) =>
    pages.map((page) => ({
      url: `${SITE_URL}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: page === '' ? 1 : page === '/login' || page === '/signup' ? 0.5 : 0.8,
      alternates: {
        languages: {
          en: `${SITE_URL}/en${page}`,
          it: `${SITE_URL}/it${page}`,
          'x-default': `${SITE_URL}/en${page}`,
        },
      },
    }))
  )
}
