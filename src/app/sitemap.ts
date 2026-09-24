import type { MetadataRoute } from 'next';
import { notebook } from '@/content/notebook';
import { SITE_URL } from '@/lib/url';

/** Static sitemap. `output: 'export'` writes this to /sitemap.xml at build time. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/founder', '/notebook', '/grasp'].map((route) => ({
    url: `${SITE_URL}${route}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));
  const entries = notebook.map((entry) => ({
    url: `${SITE_URL}/notebook/${entry.slug}/`,
    lastModified: new Date(`${entry.date}T00:00:00Z`),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));
  return [...pages, ...entries];
}
