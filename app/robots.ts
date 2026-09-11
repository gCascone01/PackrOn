import type { MetadataRoute } from 'next'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://packron.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/*/i/', '/*/trips', '/*/account', '/auth/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
