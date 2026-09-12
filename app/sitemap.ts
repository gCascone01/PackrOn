import type { MetadataRoute } from 'next'
import { LOCALES } from '@/lib/i18n'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://packron.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  // Public pages only. Private routes (/*/trips, /auth/*) and shared
  // itineraries (/*/i/*) are excluded — they must never be indexed.
  // /login + /signup are public auth entry points (lower priority).
  const pages = ['', '/how-it-works', '/examples', '/login', '/signup']
  return LOCALES.flatMap((locale) =>
    pages.map((page) => ({
      url: `${SITE_URL}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: page === '' ? 1 : page === '/login' || page === '/signup' ? 0.5 : 0.8,
    }))
  )
}
