import type { MetadataRoute } from 'next';
import { concepts } from '@/content/work';
import { essays } from '@/content/thinking';

/**
 * Static sitemap. `output: 'export'` writes this to /sitemap.xml at build time.
 * NEXT_PUBLIC_SITE_URL is supplied by the deploy workflow from the Pages API.
 */
const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://seventeenstudios.co').replace(
  /\/$/,
  '',
);

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['', '/studio', '/work', '/thinking', '/start'].map((route) => ({
    url: `${base}${route}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const conceptRoutes = concepts.map((concept) => ({
    url: `${base}/work/${concept.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'yearly' as const,
    priority: 0.7,
  }));

  const essayRoutes = essays.map((essay) => ({
    url: `${base}/thinking/${essay.slug}/`,
    lastModified: new Date(essay.date),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...conceptRoutes, ...essayRoutes];
}
