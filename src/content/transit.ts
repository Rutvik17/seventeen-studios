import raw from './transit.json';

/**
 * Real TTC arrivals for the stop the board's display shows.
 *
 * ---
 *
 * WHAT IS REAL, AND WHAT IS ONLY REAL-ISH
 *
 * The route, the stop and the intersection are facts and do not move between
 * builds: the 504 King really does stop at King St West at John St.
 *
 * The minutes are real observations, captured when the site was built rather
 * than fetched when it is read. A static export cannot call an API on a
 * visitor's behalf — there is no server, and the feed sends no CORS headers —
 * so the honest options are a real captured number with a timestamp, or an
 * invented one with none. `capturedAt` is on the object so any surface showing
 * a time can say when it was true.
 *
 * The device on the landing page would poll this feed directly over Wi-Fi.
 * That is the whole reason it is the thing on its display.
 */

export type TransitRoute = {
  route: string;
  routeTitle: string;
  stopTitle: string;
  direction: string | null;
  /** Next arrivals, soonest first. */
  minutes: number[];
};

export type TransitData = {
  capturedAt: string;
  agency: string;
  stopId: number;
  source: string;
  note: string;
  routes: TransitRoute[];
};

export const transit = raw as TransitData;

/** The soonest arrival — what the display has room for. */
export const nextArrival = (): TransitRoute | undefined => transit.routes[0];

/**
 * The stop, shortened for a 296-pixel panel.
 *
 * The feed's titles carry a side ("East Side") that matters to a driver and not
 * to someone deciding whether to leave the house. Trimming it is the difference
 * between a line that fits and one that is clipped mid-word.
 */
export function shortStop(title: string): string {
  return title
    .replace(/\s+(East|West|North|South)\s+Side$/i, '')
    .replace(/\bStreet\b/gi, 'St')
    .replace(/\bAvenue\b/gi, 'Ave')
    .replace(/\bAt\b/g, '&');
}
