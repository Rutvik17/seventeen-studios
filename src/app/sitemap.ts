import type { MetadataRoute } from 'next';
import { policies } from '@/content/policies';
import { SITE_URL } from '@/lib/url';

/** Static sitemap. `output: 'export'` writes this to /sitemap.xml at build time. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/founder', '/notebook', '/grasp', '/start'].map((route) => ({
    url: `${SITE_URL}${route}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const policyRoutes = policies.map((policy) => ({
    url: `${SITE_URL}/legal/${policy.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'yearly' as const,
    priority: 0.3,
  }));

  return [...pages, ...policyRoutes];
}
