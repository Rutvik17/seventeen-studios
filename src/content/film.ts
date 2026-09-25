/**
 * The landing's film — its title, and the shots it is cut from.
 *
 * The film opens on a blank page: the pencil draws Nvidia's campus in Santa
 * Clara, the brush lays the washes in, and then the year turns over it, one
 * shot at a time, round and round. Each shot is a moment — a season, a time
 * of day, a weather — and everything the painting does in it is read from
 * here: which season's trees and grass, which sky, how dark, what is falling.
 *
 * The engine (`src/lib/film`) knows how to paint; this knows what to paint.
 */

import type { Season } from '@/lib/film/campus';

export type SkyId = 'clear' | 'storm' | 'dusk' | 'night' | 'dawn';

export interface Shot {
  id: string;
  /** Written in the corner of the painting, the way a sketchbook page is captioned. */
  label: string;
  season: Season;
  sky: SkyId;
  /** The colour the whole painting is glazed with, and how strongly (0–1). */
  glaze: [string, number];
  /** 0 is noon, 1 is the middle of the night: windows, lamps, headlights, stars. */
  night: number;
  /** How busy the street is, 0–1. */
  bustle: number;
  weather: {
    rain?: number;
    snow?: number;
    leaves?: number;
    petals?: number;
    birds?: number;
    lightning?: number;
    clouds?: number;
  };
  /** Where the camera rests, in world units, and how close. */
  camera: { x: number; y: number; zoom: number };
  /** Seconds the shot holds before the next begins to arrive. */
  hold: number;
}

export const film = {
  /** The painting's title, as it would be written under it. */
  title: 'Nvidia, Santa Clara',
  description: "Nvidia's headquarters in Santa Clara — the Voyager and Endeavor buildings — sketched in pencil, painted in watercolour, and carried through a year of seasons and weather.",
  /** The captions for the two acts before the year begins. */
  sketching: 'sketching',
  painting: 'painting',
};

export const shots: Shot[] = [
  {
    id: 'spring',
    label: 'spring morning',
    season: 'spring',
    sky: 'clear',
    glaze: ['#fff6ea', 0],
    night: 0,
    bustle: 0.9,
    weather: { petals: 1, clouds: 0.5 },
    camera: { x: 800, y: 580, zoom: 1 },
    hold: 9,
  },
  {
    id: 'summer',
    label: 'summer noon',
    season: 'summer',
    sky: 'clear',
    glaze: ['#ffe9c2', 0.16],
    night: 0,
    bustle: 1,
    weather: { birds: 1, clouds: 0.35 },
    camera: { x: 700, y: 570, zoom: 1.06 },
    hold: 8,
  },
  {
    id: 'storm',
    label: 'thunderstorm',
    season: 'summer',
    sky: 'storm',
    glaze: ['#7f8aa3', 0.5],
    night: 0.35,
    bustle: 0.6,
    weather: { rain: 1, lightning: 1, clouds: 1 },
    camera: { x: 860, y: 590, zoom: 1.02 },
    hold: 9,
  },
  {
    id: 'autumn',
    label: 'autumn',
    season: 'autumn',
    sky: 'clear',
    glaze: ['#ffe2bd', 0.12],
    night: 0,
    bustle: 0.9,
    weather: { leaves: 1, clouds: 0.45 },
    camera: { x: 820, y: 580, zoom: 1.04 },
    hold: 9,
  },
  {
    id: 'dusk',
    label: 'autumn evening',
    season: 'autumn',
    sky: 'dusk',
    glaze: ['#c98a8e', 0.42],
    night: 0.6,
    bustle: 0.8,
    weather: { leaves: 0.5, clouds: 0.3 },
    camera: { x: 900, y: 585, zoom: 1.08 },
    hold: 8,
  },
  {
    id: 'winter-night',
    label: 'winter night',
    season: 'winter',
    sky: 'night',
    glaze: ['#3a4679', 0.8],
    night: 1,
    bustle: 0.35,
    weather: { snow: 1, clouds: 0.2 },
    camera: { x: 800, y: 575, zoom: 1.02 },
    hold: 10,
  },
  {
    id: 'dawn',
    label: 'winter dawn',
    season: 'winter',
    sky: 'dawn',
    glaze: ['#d7a6b4', 0.3],
    night: 0.35,
    bustle: 0.5,
    weather: { clouds: 0.4 },
    camera: { x: 760, y: 580, zoom: 1 },
    hold: 8,
  },
];
