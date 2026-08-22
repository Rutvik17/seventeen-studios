#!/usr/bin/env node
/**
 * Fetch real TTC arrivals for the stop the board's display shows.
 *
 * ---
 *
 * WHAT IS AND IS NOT REAL HERE, STATED PLAINLY
 *
 * The route number, the stop name and the intersection are **real and stable** —
 * the 504 King really does stop at King St West at John St, and that does not
 * change between builds.
 *
 * The arrival times are **real but captured**, not live. This is a static export
 * with no server: nothing on the page can call an API when a visitor opens it,
 * and the TTC feed sends no CORS headers anyway. So the numbers are true as of
 * the moment the site was built, and the site says so rather than implying a
 * live feed. `capturedAt` exists to make that checkable.
 *
 * This matters more than it sounds. A device mockup showing "next bus 7 min"
 * with no provenance is decoration; the same mockup showing a real route, a real
 * intersection and a timestamp is a design document for something buildable —
 * and the difference is one honest label.
 *
 * The real device would poll this endpoint directly over Wi-Fi, which is exactly
 * why it is on the board's display in the first place.
 *
 * Run: node scripts/fetch-transit.mjs
 */

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'content', 'transit.json');

/**
 * King St West at John St — a streetcar stop in downtown Toronto with service
 * every few minutes, chosen precisely because a quiet suburban stop returns an
 * empty prediction list most of the day and the fallback would then be the
 * thing on screen almost always.
 */
const STOP_ID = 15644;
const AGENCY = 'ttc';

async function main() {
  const url =
    `https://retro.umoiq.com/service/publicJSONFeed` +
    `?command=predictions&a=${AGENCY}&stopId=${STOP_ID}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; seventeen-studios-build/1.0; +https://github.com/Rutvik17/seventeen-studios)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  // The feed returns a bare object for one route and an array for several.
  // Normalising is not optional — the single-route shape is what you get at
  // quiet times, which is exactly when a build is most likely to run.
  const raw = json?.predictions;
  if (!raw) throw new Error('no predictions field');
  const groups = Array.isArray(raw) ? raw : [raw];

  const routes = [];
  for (const group of groups) {
    const dirRaw = group.direction;
    if (!dirRaw) continue;
    const directions = Array.isArray(dirRaw) ? dirRaw : [dirRaw];

    for (const dir of directions) {
      const predRaw = dir.prediction;
      if (!predRaw) continue;
      const preds = Array.isArray(predRaw) ? predRaw : [predRaw];
      const minutes = preds
        .map((p) => Number(p.minutes))
        .filter((m) => Number.isFinite(m))
        .slice(0, 3);
      if (minutes.length === 0) continue;

      routes.push({
        route: group.routeTag,
        routeTitle: group.routeTitle,
        stopTitle: group.stopTitle,
        direction: dir.title ?? null,
        minutes,
      });
    }
  }

  if (routes.length === 0) throw new Error('no route had a usable prediction');

  // Soonest first — the display has room for one and it should be the next one.
  routes.sort((a, b) => a.minutes[0] - b.minutes[0]);

  const payload = {
    capturedAt: new Date().toISOString(),
    agency: 'Toronto Transit Commission',
    stopId: STOP_ID,
    source: 'UMO/NextBus public JSON feed',
    /**
     * Said once, here, so every surface that renders this carries the same
     * caveat and none of them has to remember to write it.
     */
    note: 'Arrival times are real but captured at build time, not live.',
    routes,
  };

  const previous = await readFile(OUT, 'utf8').catch(() => null);
  const next = JSON.stringify(payload, null, 2) + '\n';
  if (previous === next) {
    console.log('  transit unchanged');
    return;
  }
  await writeFile(OUT, next, 'utf8');
  const first = routes[0];
  console.log(
    `  transit ${first.route} @ ${first.stopTitle} — ${first.minutes.join(', ')} min`,
  );
}

main().catch((error) => {
  // Never fail the build; the committed fixture stays. Same rule as the market
  // fetch, and for the same reason.
  console.warn(`! transit fetch failed: ${error.message}`);
});
