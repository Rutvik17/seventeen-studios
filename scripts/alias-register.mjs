/**
 * Installs `alias-hook.mjs`.
 *
 * Resolution hooks run on their own thread, so they cannot simply be imported —
 * they are registered. This file is the thing scripts pass to `--import`:
 *
 *   node --experimental-strip-types --import ./scripts/alias-register.mjs script.mjs
 */

import { register } from 'node:module';

register('./alias-hook.mjs', import.meta.url);
