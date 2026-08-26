/**
 * THE COMPANION'S SPRITE SET — what the OLED actually shows.
 *
 * Three characters, seven animations each, driven by the model rather than by a
 * timer. The character says WHICH FEATURE is currently carrying the sentiment
 * model's decision; the animation says what that decision is.
 *
 * ---
 * WHY A CHARACTER PER DRIVING FEATURE
 *
 * A face that just smiles when the number is green is decoration — it restates
 * a number you can already read. Choosing the character by which input is
 * actually moving the logit makes the panel carry something the readout does
 * not: a model leaning on five-day momentum and one leaning on the volatility
 * regime are genuinely different states, and now they look different.
 *
 * The model is a four-feature logistic regression, so these are its real
 * inputs, not aspirational ones. There is no 13F or Form 4 data in it, and
 * naming a character after institutional flow it cannot see would be exactly
 * the decorative move this is meant to avoid.
 *
 *   Fighter    return_1d — reacting to today's move. A brawler, no subtlety
 *   Shinobi    momentum_5d / momentum_20d — the trend, positioned early
 *   Samurai    vol_regime — the regime is in charge; discipline under a storm
 *
 * ---
 * MEASURED FACTS ABOUT THE PACK, NOT ASSUMED ONES
 *
 * Every frame is 128 x 128, laid out as a horizontal strip, and the panel is
 * also 128 x 128 — so a frame maps onto the panel 1:1 with no resampling. That
 * is luck, but it is checked luck: `verify-sprites.mjs` reads the PNG headers
 * and fails the build if a strip's width is not `frames * 128`.
 *
 * The pack is REGISTERED: the feet land on row 127 in every animation of every
 * character (measured, all 21 strips). That is what makes it safe to switch
 * animations on a mood change without the character jumping — there is one
 * shared crop and one shared baseline, so nothing has to be re-anchored.
 *
 * The tallest pose is 85 rows (Fighter's jump-adjacent frames reach y=43), so
 * the character never fills the panel and there are ~40 rows of headroom above
 * it for a backdrop.
 */

import { asset } from '@/lib/asset';

/** Source frame size, and the panel's resolution. The same number, twice. */
export const FRAME = 128;

/**
 * The row the feet stand on, in every animation. Measured across all 21 strips.
 *
 * It is the last row of the frame, so the character stands on the bottom edge
 * of the panel and the frame maps on with no offset. That is the pack's own
 * design decision and there is no reason to fight it.
 */
export const BASELINE = 127;

export type Character = 'Fighter' | 'Samurai' | 'Shinobi';
export type Animation = 'Idle' | 'Walk' | 'Run' | 'Attack_1' | 'Shield' | 'Hurt' | 'Dead';

/** The sentiment model's four inputs, in the order its weight vector uses. */
export type Feature = 'return_1d' | 'momentum_5d' | 'momentum_20d' | 'vol_regime';

export const CHARACTER_FOR: Record<Feature, Character> = {
  return_1d: 'Fighter',
  momentum_5d: 'Shinobi',
  momentum_20d: 'Shinobi',
  vol_regime: 'Samurai',
};

/** The shape the market file stores for the fitted model. */
export type SentimentModel = {
  featureNames: string[];
  weights: number[];
  bias: number;
  mean: number[];
  std: number[];
};

/**
 * Which feature is carrying the decision, and by how much.
 *
 * The model is linear in its standardised inputs, so its logit decomposes
 * exactly: `logit = bias + sum(w_i * z_i)`, where `z_i = (x_i - mean_i) / std_i`.
 * The driving feature is simply the term with the largest magnitude — there is
 * no heuristic here, it is the decomposition the model is already made of.
 *
 * Verified: reconstructing the probability this way reproduces every stored
 * `sentiment.probability` in the market file to four decimals, checked by
 * `verify-sprites.mjs`. If that ever stops matching, the decomposition has
 * drifted from the model and the character is lying about the reason.
 */
export function drivingFeature(model: SentimentModel, features: number[]): Feature {
  let best = 0;
  let bestMagnitude = -Infinity;
  for (let i = 0; i < features.length; i++) {
    const z = (features[i] - model.mean[i]) / model.std[i];
    const magnitude = Math.abs(model.weights[i] * z);
    if (magnitude > bestMagnitude) { bestMagnitude = magnitude; best = i; }
  }
  return model.featureNames[best] as Feature;
}

/** The character the model's current reasoning puts on the panel. */
export function characterFor(model: SentimentModel, features: number[]): Character {
  return CHARACTER_FOR[drivingFeature(model, features)] ?? 'Fighter';
}

/**
 * Frames per strip. Verified against the PNG headers by `verify-sprites.mjs` —
 * a wrong count here would show as a stutter or a slice of the next frame, and
 * that is exactly the kind of thing proofreading misses.
 */
export const FRAMES: Record<Character, Record<Animation, number>> = {
  Fighter: { Idle: 6, Walk: 8, Run: 8, Attack_1: 4, Shield: 2, Hurt: 3, Dead: 3 },
  Samurai: { Idle: 6, Walk: 8, Run: 8, Attack_1: 6, Shield: 2, Hurt: 2, Dead: 3 },
  Shinobi: { Idle: 6, Walk: 8, Run: 8, Attack_1: 5, Shield: 4, Hurt: 2, Dead: 4 },
};

/**
 * How fast each animation plays, in frames per second.
 *
 * Not one global rate: an idle breath and a run cycle read wrong at the same
 * speed. Idle is slow because it is a breath; Run is fast because the legs have
 * to cover ground; Dead is slow and then stops.
 */
export const FPS: Record<Animation, number> = {
  Idle: 7,
  Walk: 9,
  Run: 12,
  Attack_1: 11,
  Shield: 5,
  Hurt: 8,
  Dead: 6,
};

/** Animations that play once and hold on the last frame rather than looping. */
export const HOLDS_LAST: ReadonlySet<Animation> = new Set<Animation>(['Dead']);

/**
 * The model's reading, turned into a pose.
 *
 * The thresholds are the same ones the readout uses, so the character and the
 * number can never disagree — a panel showing a victory pose next to a red
 * number would be worse than no panel.
 */
export function animationFor(percentile: number, awake = true): Animation {
  if (!awake) return 'Idle';
  if (percentile >= 0.9) return 'Attack_1'; // conviction: on the offensive
  if (percentile >= 0.65) return 'Run';
  if (percentile >= 0.35) return 'Walk';
  if (percentile >= 0.15) return 'Idle';
  if (percentile >= 0.05) return 'Shield'; // defensive, hedged
  if (percentile >= 0.01) return 'Hurt';
  return 'Dead';
}

/**
 * Where the strip lives, as served by Next's static export.
 *
 * Through `asset()`, and that is not optional. This is written into an SVG
 * `<image href>` by hand, and Next only rewrites `basePath` for its own
 * emissions and for `next/link` / `next/image`. A bare `/sprites/...` resolves
 * against the domain ROOT, which is wrong on a GitHub project page served from
 * `/<repo>` — it 404s in production while working perfectly in dev, because dev
 * has no base path to miss.
 *
 * This is the second time that has happened here; the first cost the founder
 * portrait and the resume downloads. `verify-assets.mjs` now checks it.
 */
export function spriteSrc(character: Character, animation: Animation): string {
  return asset(`/sprites/${character}/${animation}.png`);
}

/** One loop of an animation, in seconds — the duration a CSS step cycle needs. */
export function cycleSeconds(character: Character, animation: Animation): number {
  return FRAMES[character][animation] / FPS[animation];
}
