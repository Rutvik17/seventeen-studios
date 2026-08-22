/**
 * THE DRIVE — the road taken, and what the signs over it say.
 *
 * ==================================================================
 * ONE JOURNEY, NORTH
 * ==================================================================
 *
 * From Bowling Green up Broadway, east along Wall Street to the river, north to
 * the Brooklyn Bridge and out over it, back across the Manhattan Bridge, up
 * through the Bowery and Third Avenue, west along 42nd into Times Square, then
 * north past Central Park to Harlem.
 *
 * It is a route anyone could drive, and it is chosen so the city arrives in the
 * order the career did: the small dense downtown blocks first, the bridges in
 * the middle where the view opens, then the midtown wall, then the park.
 *
 * ==================================================================
 * THE RÉSUMÉ IS ON THE GANTRIES
 * ==================================================================
 *
 * Every message is three lines of 5x7 dot matrix, because that is what a
 * variable-message sign is. It imposes a real constraint — about fourteen
 * characters a line before it stops being readable from far enough away to
 * matter — and the constraint is the point: a sign you can read at 200 m says
 * one thing, and having to choose that thing is worth more than the paragraph
 * it replaces.
 */

import { AVENUE, blockZ, downtownZ } from '@/lib/city/world';
import type { Waypoint } from '@/lib/city/route';
import type { Sign } from '@/lib/city/signs';

/* ------------------------------------------------------------------ *
 * The road
 * ------------------------------------------------------------------ */

/**
 * Bridge decks carry their own height, so the camera climbs with the roadway.
 *
 * The Brooklyn Bridge's deck is 38 m over the water at mid-span and about ten
 * at the anchorages; the Manhattan Bridge is a little higher at 41 m. Driving
 * one of these is mostly the experience of rising above everything and then
 * coming back down into it, and flattening the deck throws that away.
 */
export const DRIVE: Waypoint[] = [
  { x: -200, z: downtownZ(340), name: 'Bowling Green' },
  { x: -300, z: downtownZ(760) },

  // East along Wall Street, which starts at a church and ends at the river.
  { x: -330, z: downtownZ(1010), name: 'Wall Street' },
  { x: -60, z: downtownZ(1000) },
  { x: 330, z: downtownZ(985), name: 'the East River' },

  // North along the waterfront to City Hall and the bridge approach.
  { x: 400, z: downtownZ(1240) },
  { x: 330, z: downtownZ(1470), name: 'City Hall' },
  { x: 560, z: downtownZ(1550), y: 12, name: 'Brooklyn Bridge' },
  { x: 880, z: downtownZ(1470), y: 30 },
  { x: 1190, z: downtownZ(1390), y: 38 },
  { x: 1520, z: downtownZ(1310), y: 30 },
  { x: 1820, z: downtownZ(1230), y: 12, name: 'Brooklyn' },

  // A block in Brooklyn, and back.
  { x: 2120, z: downtownZ(1260) },
  { x: 2260, z: downtownZ(1560) },
  { x: 2050, z: downtownZ(1720) },

  // Back over the Manhattan Bridge.
  { x: 1900, z: downtownZ(1700), y: 12, name: 'Manhattan Bridge' },
  { x: 1590, z: downtownZ(1765), y: 34 },
  { x: 1290, z: downtownZ(1825), y: 41 },
  { x: 980, z: downtownZ(1890), y: 34 },
  { x: 680, z: downtownZ(1950), y: 12, name: 'Chinatown' },

  // North through the Bowery onto Third Avenue.
  { x: 520, z: downtownZ(2400) },
  { x: 560, z: blockZ(4), name: 'the Bowery' },
  { x: AVENUE.third, z: blockZ(14), oneWay: true },
  { x: AVENUE.third, z: blockZ(30), name: 'Murray Hill', oneWay: true },
  { x: AVENUE.third, z: blockZ(42), oneWay: true },

  // West along 42nd Street into Times Square.
  { x: AVENUE.park, z: blockZ(42), name: '42nd Street' },
  { x: AVENUE.sixth, z: blockZ(42) },
  { x: AVENUE.seventh, z: blockZ(43), name: 'Times Square' },

  // North to the park, and up its edge.
  { x: AVENUE.seventh, z: blockZ(56), oneWay: true },
  { x: AVENUE.eighth, z: blockZ(60), name: 'Central Park' },
  { x: AVENUE.eighth, z: blockZ(86) },
  { x: AVENUE.eighth, z: blockZ(112), name: 'Harlem' },
];

/* ------------------------------------------------------------------ *
 * The signs
 * ------------------------------------------------------------------ */

/**
 * Where each message stands, as a fraction of the way along the drive.
 *
 * A fraction rather than a distance in metres, so re-routing the drive does not
 * silently strand every sign in the wrong place — they redistribute along
 * whatever road there now is.
 */
export type Placed = Omit<Sign, 'z' | 'x' | 'halfWidth' | 'heading'> & { at: number };

export const MESSAGES: Placed[] = [
  {
    id: 'name',
    at: 0.02,
    lines: ['RUTVIK PATEL', 'SOFTWARE', 'ENGINEER'],
    footer: 'TORONTO CANADA',
  },
  {
    id: 'wall-st',
    at: 0.06,
    lines: ['CREDIT RISK', 'MONTE CARLO', 'VASICEK'],
    footer: 'BUILT AND SHOWN ITS WORKING',
  },
  {
    id: 'years',
    at: 0.12,
    lines: ['9 YEARS', 'IN PRODUCTION', 'UNDER LOAD'],
    footer: 'WEB IOS ANDROID',
  },
  {
    id: 'ey',
    at: 0.2,
    lines: ['ERNST & YOUNG', 'LEAD FRONTEND', '2023 - NOW'],
    footer: 'AGENTIC AI PLATFORM',
  },
  {
    id: 'ey-detail',
    at: 0.26,
    lines: ['MULTI TENANT', 'NEXT JS + AZURE', '40% FASTER'],
    footer: 'USED BY CLIENTS GLOBALLY',
  },
  {
    id: 'shopware',
    at: 0.35,
    lines: ['SHOP-WARE', 'ZERO TO ONE', '2022 - 2023'],
    footer: 'IOS + ANDROID TO ACQUISITION',
  },
  {
    id: 'nuvalence',
    at: 0.44,
    lines: ['NUVALENCE', 'FORD CONNECTED', 'VEHICLE'],
    footer: 'AND NYC GOVERNMENT SYSTEMS',
  },
  {
    id: 'mitel',
    at: 0.52,
    lines: ['MITEL', 'DESIGN SYSTEM', '2018 - 2021'],
    footer: 'ONE LIBRARY THREE PLATFORMS',
  },
  {
    id: 'grasp',
    at: 0.62,
    lines: ['GRASP', 'CALCULUS YOU', 'CAN TOUCH'],
    footer: 'REACT NATIVE SKIA REANIMATED',
  },
  {
    id: 'stack',
    at: 0.71,
    lines: ['REACT', 'TYPESCRIPT', 'NEXT JS'],
    footer: 'GSAP THREE JS GLSL NODE PYTHON',
  },
  {
    id: 'proof',
    at: 0.79,
    lines: ['EVERY NUMBER', 'ON THIS SITE', 'IS CHECKED'],
    footer: 'BY A SCRIPT NOT BY PROOFREADING',
  },
  {
    id: 'hiring',
    at: 0.88,
    lines: ['LOOKING FOR', 'SENIOR ROLES', 'BIG TECH'],
    footer: 'REMOTE OR TORONTO',
  },
  {
    id: 'end',
    at: 0.96,
    lines: ['THANKS FOR', 'THE DRIVE', 'RESUME BELOW'],
    footer: 'SEVENTEEN STUDIOS',
  },
];
