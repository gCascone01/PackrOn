import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://packron.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
       url: 'https://packron.vercel.app/come-funziona',
       lastModified: new Date(),
       changeFrequency: 'monthly',
       priority: 0.8,
     },
     {
       url: 'https://packron.vercel.app/esempi',
       lastModified: new Date(),
       changeFrequency: 'monthly',
       priority: 0.8,
     }
  ]
}