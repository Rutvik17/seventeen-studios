import type { Metadata } from 'next';

/**
 * The founder page — cleared for a rebuild.
 *
 * The route stays up while it is empty: the nav, the work list, the sitemap and
 * the Person node every notebook lesson names as its author all point here, and
 * a link that 404s is worse than a page with nothing on it yet.
 */
export const metadata: Metadata = {
  title: 'Founder',
};

export default function FounderPage() {
  return <div className="page" />;
}
