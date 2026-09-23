import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/url';

/** Static sitemap. `output: 'export'` writes this to /sitemap.xml at build time. */
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/founder', '/notebook', '/grasp', '/start'].map((route) => ({
    url: `${SITE_URL}${route}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));
}
