import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://packron.vercel.app'

const SITE_NAME = 'PackrOn'
const SITE_DESCRIPTION =
  'Plan road trips and city trips with smart itineraries, interactive maps, editable timelines, and fuel/toll cost estimates.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'PackrOn — AI-powered Travel Planner',
    template: '%s | PackrOn',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: 'travel',
  keywords: [
    'road trip planner',
    'city trip planner',
    'AI travel planner',
    'itinerary generator',
    'route planner',
    'fuel cost estimator',
    'travel map',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  generator: 'Next.js',
  alternates: {
    canonical: '/',
    languages: {
      en: '/en',
      it: '/it',
      'x-default': '/en',
    },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: '/',
    title: 'PackrOn — AI-powered Travel Planner',
    description: SITE_DESCRIPTION,
    locale: 'en_US',
    alternateLocale: ['it_IT'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PackrOn — AI-powered Travel Planner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PackrOn — AI-powered Travel Planner',
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  other: {
    'msapplication-TileColor': '#ffffff',
  },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      sameAs: ['https://www.instagram.com/packron.app/'],
    },
    {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: ['en', 'it'],
    },
    {
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: 'TravelApplication',
      operatingSystem: 'Web',
      description: SITE_DESCRIPTION,
    },
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`bg-background ${inter.variable} ${jakarta.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <Providers>
          {children}
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
