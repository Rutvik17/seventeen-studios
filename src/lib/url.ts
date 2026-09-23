/**
 * Where the site lives — the one place the address is written down.
 *
 * The deploy workflow supplies `NEXT_PUBLIC_SITE_URL` from the repository name,
 * so production builds always use the real address. The fallback is that same
 * address, not a domain the site has never been served from: it used to be
 * `seventeenstudios.co`, which is what every local build and every link
 * preview generated from one advertised — a URL that led nowhere.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rutvik17.github.io/seventeen-studios').replace(
  /\/$/,
  '',
);

/** The address without its scheme, as printed on share cards and in the footer. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
