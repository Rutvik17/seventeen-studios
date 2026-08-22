#!/usr/bin/env node
/**
 * Build the TTC stop index the site uses to find a visitor's nearest stop.
 *
 * ---
 *
 * WHY THIS EXISTS AND THE MARKET FETCH DOES NOT WORK THE SAME WAY
 *
 * The UMO/NextBus feed sends `Access-Control-Allow-Origin: *`, so a browser is
 * allowed to call it directly. That means arrival times can be genuinely LIVE
 * for whoever is reading — fetched when they open the page, for the stop nearest
 * to them — with no server anywhere.
 *
 * What the browser cannot do cheaply is discover which stop is nearest, because
 * that needs coordinates for all ~10,000 of them and the feed only gives them
 * out one route at a time (214 requests). So the index is built here, once,
 * shipped as a static file, and the live prediction call happens in the page.
 *
 * Yahoo, by contrast, sends no CORS headers at all, which is why market data is
 * captured at build time and cannot be anything else.
 *
 * ---
 *
 * IT LIVES IN public/, NOT src/
 *
 * ~450 KB of stop coordinates has no business in the JavaScript bundle. As a
 * static file it is fetched only when a visitor actually asks for their nearest
 * stop, so the landing page never pays for it. Any path into `public/` must go
 * through `asset()` — see rule 2.
 *
 * ---
 *
 * IT SKIPS ITSELF
 *
 * Stops move perhaps a few times a year, and 214 requests on every deploy is
 * both slow and a good way to get rate-limited. The index is regenerated only
 * when it is missing or older than 30 days; `--force` overrides.
 *
 * Run: node scripts/fetch-stops.mjs [--force]
 */

import { writeFile, readFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'public', 'data');
const OUT = join(OUT_DIR, 'ttc-stops.json');

const BASE = 'https://retro.umoiq.com/service/publicJSONFeed';
const UA =
  'Mozilla/5.0 (compatible; seventeen-studios-build/1.0; +https://github.com/Rutvik17/seventeen-studios)';
const MAX_AGE_DAYS = 30;
/** Politeness. The feed is free and public; hammering it is how it stops being. */
const CONCURRENCY = 4;

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function isFresh() {
  try {
    const info = await stat(OUT);
    const ageDays = (Date.now() - info.mtimeMs) / 86_400_000;
    return ageDays < MAX_AGE_DAYS;
  } catch {
    return false;
  }
}

async function main() {
  if (!process.argv.includes('--force') && (await isFresh())) {
    console.log(`  stops index is under ${MAX_AGE_DAYS} days old; skipping`);
    return;
  }

  const list = await getJson(`${BASE}?command=routeList&a=ttc`);
  const routes = (Array.isArray(list.route) ? list.route : [list.route]).filter(Boolean);
  console.log(`  ${routes.length} routes`);

  /**
   * Keyed by stopId, because a stop served by four routes appears in four route
   * configs and must be one entry with four route tags — otherwise the nearest
   * stop is found four times and the reader is offered the same corner twice.
   */
  const stops = new Map();
  let done = 0;

  const queue = [...routes];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const route = queue.shift();
      if (!route) break;
      try {
        const cfg = await getJson(`${BASE}?command=routeConfig&a=ttc&r=${route.tag}`);
        const raw = cfg.route?.stop;
        const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
        for (const s of list) {
          // `stopId` is the public number on the pole and is what the
          // predictions endpoint wants. Some entries have only an internal
          // `tag`, which cannot be queried, so they are useless here.
          if (!s.stopId) continue;
          const id = Number(s.stopId);
          const lat = Number(s.lat);
          const lon = Number(s.lon);
          if (!Number.isFinite(id) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;

          const existing = stops.get(id);
          if (existing) {
            if (!existing.r.includes(route.tag)) existing.r.push(route.tag);
          } else {
            stops.set(id, {
              i: id,
              // Five decimal places is about a metre. More is noise and costs
              // two bytes per stop across ten thousand of them.
              a: Math.round(lat * 1e5) / 1e5,
              o: Math.round(lon * 1e5) / 1e5,
              t: s.title,
              r: [route.tag],
            });
          }
        }
      } catch (error) {
        console.warn(`  ! route ${route.tag}: ${error.message}`);
      }
      done += 1;
      if (done % 40 === 0) console.log(`  ${done}/${routes.length} routes`);
    }
  });

  await Promise.all(workers);

  if (stops.size < 1000) {
    throw new Error(`only ${stops.size} stops resolved; refusing to overwrite`);
  }

  const payload = {
    builtAt: new Date().toISOString(),
    agency: 'ttc',
    source: 'UMO/NextBus routeConfig',
    /** Short keys: i=stopId, a=lat, o=lon, t=title, r=routes. */
    stops: [...stops.values()].sort((x, y) => x.i - y.i),
  };

  await mkdir(OUT_DIR, { recursive: true });
  const json = JSON.stringify(payload);
  await writeFile(OUT, json, 'utf8');
  console.log(`  wrote ${stops.size} stops (${(json.length / 1024).toFixed(0)} KB)`);
}

main().catch((error) => {
  // Never fail the build; a missing index just means the live-location control
  // stays hidden and the captured default is shown instead.
  console.warn(`! stop index failed: ${error.message}`);
});
