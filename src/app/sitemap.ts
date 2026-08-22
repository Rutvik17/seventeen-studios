import type { MetadataRoute } from 'next';
import { products } from '@/content/products';
import { policies } from '@/content/policies';

/**
 * Static sitemap. `output: 'export'` writes this to /sitemap.xml at build time.
 * NEXT_PUBLIC_SITE_URL is supplied by the deploy workflow from the Pages API.
 */
const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://seventeenstudios.co').replace(
  /\/$/,
  '',
);

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['', '/lab', '/founder', '/products', '/start'].map((route) => ({
    url: `${base}${route}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const productRoutes = products.map((product) => ({
    url: `${base}/products/${product.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  /*
    Listed rather than hidden. The Grasp privacy policy is a URL submitted to
    App Store review, and a page search engines cannot reach is one more thing
    that can look wrong during a review it has no reason to fail.
  */
  const policyRoutes = policies.map((policy) => ({
    url: `${base}/legal/${policy.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'yearly' as const,
    priority: 0.3,
  }));

  return [...staticRoutes, ...productRoutes, ...policyRoutes];
}
