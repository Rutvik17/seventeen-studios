import type { MetadataRoute } from 'next';
import { problems } from '@/content/algorithms';
import { SITE_URL } from '@/lib/url';

/** Static sitemap. `output: 'export'` writes this to /sitemap.xml at build time. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/founder', '/algorithms', '/grasp'].map((route) => ({
    url: `${SITE_URL}${route}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));
  const each = problems.map((p) => ({
    url: `${SITE_URL}/algorithms/${p.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));
  return [...pages, ...each];
}
