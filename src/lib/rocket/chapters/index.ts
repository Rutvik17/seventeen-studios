/**
 * Every chapter of the rocket entry, by the id its words are filed under in
 * `content/rocket.ts`. The page opens whichever one the reader turns to.
 */

import type { RocketChapterId } from '@/content/rocket';
import type { Chapter } from './chapter';
import { createLiftOff } from './liftOff';
import { createStaging } from './staging';
import { createOrbit } from './orbit';
import { createLanding } from './landing';

export const CHAPTERS: Record<RocketChapterId, () => Chapter> = {
  'lift-off': createLiftOff,
  staging: createStaging,
  orbit: createOrbit,
  landing: createLanding,
};

export type { Chapter, Input, Sound, Tone, WorkingLine } from './chapter';
