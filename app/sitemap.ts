import type { MetadataRoute } from 'next'
import { LOCALES } from '@/lib/i18n'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://packron.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/how-it-works', '/examples']
  return LOCALES.flatMap((locale) =>
    pages.map((page) => ({
      url: `${SITE_URL}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: page === '' ? 1 : 0.8,
    }))
  )
}
