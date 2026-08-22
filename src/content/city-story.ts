/**
 * THE STORY — where the camera goes, and what it says when it gets there.
 *
 * ==================================================================
 * A ROUTE, NOT A SLIDESHOW
 * ==================================================================
 *
 * Each beat carries a camera and a point in the city it is about. Scroll blends
 * from one camera to the next, and the card for the current beat is joined to
 * its anchor by a line drawn to wherever that point lands on the page this
 * frame.
 *
 * The anchor is a **world coordinate**, not a screen position. That is the
 * whole trick: the card stays put while the city moves under it, and the line
 * between them stretches and swings because the building it points at is
 * genuinely moving past. A line drawn to a fixed screen point would be a
 * decoration; this one is a measurement.
 *
 * ==================================================================
 * THE ARC
 * ==================================================================
 *
 * Up from the street, into the air, out to the whole map, back down into Times
 * Square, and then off the planet. It goes in the order the career went, so
 * climbing the city and getting further from it are the same movement.
 */

import { career, founder, founderStack, sideWork } from './founder';
import { AVENUE, LANDMARKS, PARK, blockZ, downtownZ } from '@/lib/city/world';
import type { Camera } from '@/lib/city/camera';

export type Beat = {
  id: string;
  /** Small label above the title. */
  kicker: string;
  title: string;
  /** One or two short paragraphs. */
  body: string[];
  /** Bulleted detail, optional. */
  points?: string[];
  /** Chips under the body, optional. */
  tags?: string[];
  /** The point in the city this card is about. */
  anchor: { x: number; y: number; z: number };
  /** What the camera does while this beat is on screen. */
  camera: Partial<Camera>;
  /** How the card sits on the page. */
  side: 'left' | 'right';
  /** Detail radius and how far the massing carries. */
  render?: { radius?: number; massRadius?: number };
};

const es = LANDMARKS.find((l) => l.id === 'empire-state')!;
const chrysler = LANDMARKS.find((l) => l.id === 'chrysler')!;
const wtc = LANDMARKS.find((l) => l.id === 'one-wtc')!;
const rock = LANDMARKS.find((l) => l.id === 'rockefeller')!;
const cpt = LANDMARKS.find((l) => l.id === 'central-park-tower')!;

/** Oldest first, so the walk runs in the order it happened. */
const record = [...career].reverse();

const roleBeat = (
  index: number,
  anchor: { x: number; y: number; z: number },
  camera: Partial<Camera>,
  side: 'left' | 'right',
  render?: { radius?: number; massRadius?: number },
): Beat => {
  const entry = record[index];
  return {
    id: `role-${entry.index}`,
    kicker: entry.period,
    title: entry.role,
    body: [`${entry.org} · ${entry.location}`, entry.summary],
    points: entry.highlights,
    tags: entry.stack,
    anchor,
    camera,
    side,
    render,
  };
};

export const BEATS: Beat[] = [
  /* ---- 1. the street ---- */
  {
    id: 'open',
    kicker: founder.location,
    title: founder.name,
    body: [
      founder.role.replace('Founder · ', ''),
      'Nine years of production engineering — interfaces, platforms, and the awkward parts in between. This is the whole of it, drawn as a city, because a career is mostly a route through one.',
    ],
    tags: ['React', 'TypeScript', 'React Native', 'Next.js'],
    anchor: { x: AVENUE.sixth + 60, y: 90, z: blockZ(36) },
    camera: {
      x: AVENUE.sixth,
      y: 1.7,
      z: blockZ(26),
      pitch: 0,
      yaw: 0,
      shiftY: 300,
      fov: (52 * Math.PI) / 180,
    },
    side: 'left',
    render: { radius: 1700, massRadius: 9000 },
  },

  /* ---- 2..6. the record, climbing ---- */
  roleBeat(
    0,
    { x: AVENUE.sixth + 90, y: 40, z: blockZ(44) },
    { x: AVENUE.sixth, y: 24, z: blockZ(34), pitch: 0, yaw: 0, shiftY: 260 },
    'left',
    { radius: 1700, massRadius: 10000 },
  ),
  roleBeat(
    1,
    { x: rock.x, y: rock.height * 0.7, z: rock.z },
    { x: AVENUE.sixth + 20, y: 120, z: blockZ(40), pitch: 0, yaw: 0.06, shiftY: 200 },
    'right',
    { radius: 1900, massRadius: 12000 },
  ),
  roleBeat(
    2,
    { x: chrysler.x, y: chrysler.height, z: chrysler.z },
    { x: AVENUE.fifth - 120, y: 300, z: blockZ(30), pitch: -0.02, yaw: 0.34, shiftY: 150 },
    'left',
    { radius: 2100, massRadius: 16000 },
  ),
  roleBeat(
    3,
    { x: es.x, y: es.tip ?? es.height, z: es.z },
    { x: AVENUE.seventh, y: 520, z: blockZ(18), pitch: -0.03, yaw: 0.2, shiftY: 130 },
    'right',
    { radius: 2300, massRadius: 20000 },
  ),
  roleBeat(
    4,
    { x: wtc.x, y: wtc.tip ?? wtc.height, z: wtc.z },
    { x: -1100, y: 760, z: downtownZ(-500), pitch: -0.06, yaw: 0.16, shiftY: 110 },
    'left',
    { radius: 2400, massRadius: 24000 },
  ),

  /* ---- 7. the park, and what gets built outside work ---- */
  {
    id: 'built',
    kicker: 'Built outside client hours',
    title: 'Things I make because I want them to exist',
    body: [
      'Grasp — a calculus app where every idea is something you drag rather than memorise. Nine lessons, three interaction primitives, all the maths in worklets so a drag never drops a frame.',
      'And this: a circuit board that assembles as you scroll, an e-ink companion driven by a logistic regression, a credit-risk book simulated under a Vasicek factor model. Every number on this site is checked by a script, not by proofreading.',
    ],
    tags: sideWork[0].stack,
    anchor: { x: (PARK.west + PARK.east) / 2, y: 20, z: blockZ(85) },
    camera: {
      x: PARK.east + 900,
      y: 1500,
      z: blockZ(54),
      pitch: -0.26,
      yaw: -0.42,
      shiftY: 40,
      fov: (56 * Math.PI) / 180,
    },
    side: 'right',
    render: { radius: 2400, massRadius: 26000 },
  },

  /* ---- 8. the whole map ---- */
  {
    id: 'stack',
    kicker: 'Working tools',
    title: 'The whole of it, from above',
    body: [
      'Interfaces and the platforms under them. Nine years across web, iOS and Android — one product taken from an empty repository to an acquisition, one enterprise AI platform used by clients globally.',
    ],
    points: founderStack.map((g) => `${g.group} — ${g.items.join(', ')}`),
    anchor: { x: cpt.x, y: cpt.height, z: cpt.z },
    camera: {
      x: 200,
      y: 7200,
      z: downtownZ(-800),
      pitch: -1.04,
      yaw: 0,
      shiftY: 0,
      fov: (66 * Math.PI) / 180,
    },
    side: 'left',
    render: { radius: 2600, massRadius: 34000 },
  },
];

/** Where the finale happens: Times Square, Broadway at Seventh. */
export const TIMES_SQUARE = {
  x: AVENUE.seventh + 70,
  z: blockZ(45.5),
  camera: {
    x: AVENUE.seventh + 40,
    y: 22,
    z: blockZ(43),
    pitch: 0,
    yaw: 0,
    shiftY: 250,
    fov: (58 * Math.PI) / 180,
  } as Partial<Camera>,
};
