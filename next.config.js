/**
 * Next.js configuration.
 *
 * The site ships as a fully static bundle so it can be hosted for free on
 * GitHub Pages:
 *   - `output: 'export'` emits plain HTML/CSS/JS into `out/`.
 *   - `basePath` / `assetPrefix` are driven by NEXT_PUBLIC_BASE_PATH because a
 *     GitHub *project* page is served from `/<repo>` rather than the domain
 *     root. The deploy workflow sets it from the Pages API; local dev leaves
 *     it empty so `localhost:3000` still works.
 *   - `images.unoptimized` is required — the export target has no image
 *     optimisation server. (All artwork on this site is generated in the
 *     browser via SVG/canvas, so there is nothing to optimise anyway.)
 *   - `trailingSlash` makes every route emit `index.html` inside its own
 *     directory, which is what static hosts expect for clean URLs.
 */

// A user/organisation page reports its base path as '/', which Next rejects —
// normalise that (and any trailing slash) down to an empty string.
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const basePath = rawBasePath === '/' ? '' : rawBasePath.replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  // Three.js ships as ES modules; fiber and drei do too.
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

module.exports = nextConfig;
