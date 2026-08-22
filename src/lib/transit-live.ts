/**
 * Live transit, in the browser, for wherever the reader actually is.
 *
 * ---
 *
 * THIS ONE GENUINELY IS LIVE, AND THE MARKET DATA GENUINELY IS NOT
 *
 * The distinction is not a preference, it is what each upstream permits:
 *
 * - The UMO/NextBus feed sends `Access-Control-Allow-Origin: *`, so the page
 *   may call it directly. Arrival times here are fetched when the reader asks,
 *   for the stop nearest to them.
 * - Yahoo Finance sends no CORS headers at all, so a price call from a browser
 *   is blocked before any of our code runs. Market data is therefore captured
 *   at build time and cannot be otherwise without a server.
 *
 * Both facts are stated on the surfaces that show them. Claiming "live" for
 * something captured six hours ago is the kind of small lie that a technical
 * reader catches and then re-reads everything else with suspicion.
 *
 * ---
 *
 * GEOLOCATION IS ASKED FOR, NEVER TAKEN
 *
 * Nothing here runs on page load. The browser only prompts when someone presses
 * the control, because an unprompted location request on arrival is the single
 * most hostile thing a site can do — most people refuse it on reflex and the
 * permission is then denied for good.
 *
 * The coordinates never leave the device. The nearest stop is found against a
 * static file we ship; the only thing sent anywhere is a stop number.
 */

import { asset } from './asset';

const FEED = 'https://retro.umoiq.com/service/publicJSONFeed';

export type Stop = {
  /** Public stop number, printed on the pole. */
  id: number;
  lat: number;
  lon: number;
  title: string;
  routes: string[];
  /** Metres from the coordinates supplied. */
  distance: number;
};

export type Arrival = {
  route: string;
  routeTitle: string;
  direction: string | null;
  minutes: number[];
};

export type LiveTransit = {
  stop: Stop;
  arrivals: Arrival[];
  fetchedAt: number;
};

type RawStop = { i: number; a: number; o: number; t: string; r: string[] };

let stopCache: RawStop[] | null = null;

/**
 * The stop index, fetched once and kept.
 *
 * ~800 KB, which is why it is a static file rather than part of the bundle and
 * why it is only ever loaded from a user gesture. The landing page never pays
 * for it.
 */
async function loadStops(): Promise<RawStop[]> {
  if (stopCache) return stopCache;
  const res = await fetch(asset('/data/ttc-stops.json'));
  if (!res.ok) throw new Error(`stop index unavailable (${res.status})`);
  const json = (await res.json()) as { stops: RawStop[] };
  stopCache = json.stops;
  return stopCache;
}

/**
 * Great-circle distance in metres — the haversine formula.
 *
 *     a = sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)
 *     d = 2R · atan2(√a, √(1−a))
 *
 * Straight Pythagoras on latitude and longitude is wrong for a reason that
 * matters at this scale: a degree of longitude is only about 73 km at Toronto's
 * latitude against 111 km at the equator, so treating the two axes as equal
 * stretches east–west distances by about a third. Over a few hundred metres
 * that is the difference between the stop across the road and the one around
 * the corner.
 *
 * `R` is the mean Earth radius. The planet is not a sphere, but the error from
 * pretending it is runs to about 0.3% — a few metres here, and far below the
 * accuracy of a phone's own fix.
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** The visitor's position, if they allow it. */
export function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser has no location support.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      // The browser's own messages are unhelpful ("User denied Geolocation").
      reject(
        new Error(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was declined.'
            : 'Could not get a location fix.',
        ),
      );
    }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 });
  });
}

/** The nearest stops to a point, nearest first. */
export async function nearestStops(
  lat: number,
  lon: number,
  count = 3,
): Promise<Stop[]> {
  const stops = await loadStops();

  /*
    A full scan of 9,000 stops with a haversine each is about 9,000 trig calls —
    roughly a millisecond, once, from a button press. A spatial index would be
    faster and is not worth the code: it would have to be built from the same
    9,000 records on load, which costs more than the scan it saves.
  */
  let best: Stop[] = [];
  for (const s of stops) {
    const distance = haversine(lat, lon, s.a, s.o);
    if (best.length < count || distance < best[best.length - 1].distance) {
      best.push({ id: s.i, lat: s.a, lon: s.o, title: s.t, routes: s.r, distance });
      best.sort((x, y) => x.distance - y.distance);
      best = best.slice(0, count);
    }
  }
  return best;
}

/** Live predictions for one stop. */
export async function arrivalsFor(stopId: number): Promise<Arrival[]> {
  const res = await fetch(`${FEED}?command=predictions&a=ttc&stopId=${stopId}`);
  if (!res.ok) throw new Error(`transit feed returned ${res.status}`);
  const json = await res.json();

  const raw = json?.predictions;
  if (!raw) return [];
  // One route returns an object, several return an array. Normalising is not
  // optional: the single-route shape is what a quiet stop gives back, and a
  // quiet stop is exactly where someone is most likely to be standing.
  const groups = Array.isArray(raw) ? raw : [raw];

  const arrivals: Arrival[] = [];
  for (const group of groups) {
    const dirRaw = group.direction;
    if (!dirRaw) continue;
    const directions = Array.isArray(dirRaw) ? dirRaw : [dirRaw];
    for (const dir of directions) {
      const predRaw = dir.prediction;
      if (!predRaw) continue;
      const preds = Array.isArray(predRaw) ? predRaw : [predRaw];
      const minutes = preds
        .map((p: { minutes: string }) => Number(p.minutes))
        .filter((m: number) => Number.isFinite(m))
        .slice(0, 3);
      if (minutes.length === 0) continue;
      arrivals.push({
        route: group.routeTag,
        routeTitle: group.routeTitle,
        direction: dir.title ?? null,
        minutes,
      });
    }
  }
  arrivals.sort((a, b) => a.minutes[0] - b.minutes[0]);
  return arrivals;
}

/**
 * The whole flow: ask, locate, look up, fetch.
 *
 * Walks outward through the nearest few stops because the closest one can be a
 * night-only route with nothing due — in which case the honest answer is the
 * next stop over, not "no service".
 */
export async function liveTransit(): Promise<LiveTransit> {
  const position = await currentPosition();
  const { latitude, longitude } = position.coords;
  const stops = await nearestStops(latitude, longitude, 4);

  for (const stop of stops) {
    const arrivals = await arrivalsFor(stop.id);
    if (arrivals.length > 0) {
      return { stop, arrivals, fetchedAt: Date.now() };
    }
  }
  throw new Error('No buses are due at the stops near you.');
}

/** Metres, said the way a person would say it. */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m away`;
  return `${(metres / 1000).toFixed(1)} km away`;
}
