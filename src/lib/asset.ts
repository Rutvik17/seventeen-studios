/**
 * URL for a file served out of `public/`.
 *
 * Next rewrites `basePath` for `next/link` and `next/image`, and for everything
 * it emits itself under `_next/` — but *not* for a literal `src`, `href` or
 * `fetch` you write by hand. Those resolve against the domain root, which is
 * wrong on a GitHub project page served from `/<repo>`: the founder portrait
 * and the résumé downloads 404'd in production while every stylesheet loaded
 * fine, because only the hand-written paths missed the prefix.
 *
 * Anything in `public/` that reaches the network has to go through here.
 * Route paths do not — `TransitionLink` wraps `next/link`, which handles them.
 */

// Mirrors the normalisation in next.config.js: a user/organisation page reports
// its base path as '/', which means "no prefix" rather than a literal slash.
const raw = process.env.NEXT_PUBLIC_BASE_PATH || '';
const BASE = raw === '/' ? '' : raw.replace(/\/$/, '');

export function asset(path: string): string {
  // Leave absolute URLs and data URIs alone.
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) return path;
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
