/**
 * Module resolution for the build scripts.
 *
 * The scripts in this directory import the site's real content and maths
 * modules rather than restating them, which is the only reason the artefacts
 * they emit cannot drift from the pages. That import has to work under plain
 * Node, and two things stop it:
 *
 *   - `@/lib/time` — the TypeScript path alias. Node knows nothing about
 *     `tsconfig.json`, so it treats it as a bare specifier and looks in
 *     `node_modules`.
 *   - `./types` — an extensionless relative import. Node's ESM resolver
 *     requires the extension; the bundler's does not.
 *
 * `src/content/resume.ts` sidesteps both by importing `'../lib/time.ts'` with
 * the extension spelled out, but writing content modules around the limits of a
 * build script is the wrong way round — the alias is the house style and most
 * files use it. This hook teaches Node the two rules instead.
 *
 * Registered by `alias-register.mjs`, which is what the scripts actually pass
 * to `--import`.
 *
 * Only `.ts` is resolved, never `.tsx`. `--experimental-strip-types` erases
 * type annotations; it does not transform JSX, so a component would fail with a
 * parse error further along and for a much less obvious reason. Scripts have no
 * business importing components anyway — they want data.
 */

import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const src = new URL('../src/', import.meta.url);

/** `@/lib/time` -> `<repo>/src/lib/time`, leaving anything else alone. */
function rewrite(specifier, parentURL) {
  if (specifier.startsWith('@/')) return new URL(specifier.slice(2), src);
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return parentURL ? new URL(specifier, parentURL) : null;
  }
  return null;
}

/**
 * The extension the bundler would have inferred.
 *
 * Returns the URL unchanged when it already points at a file, so an import that
 * spells out `.ts` keeps working and this stays a no-op for them.
 */
function withExtension(url) {
  if (existsSync(fileURLToPath(url))) return url;
  for (const candidate of ['.ts', '/index.ts']) {
    const guess = new URL(url.href + candidate);
    if (existsSync(fileURLToPath(guess))) return guess;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  const rewritten = rewrite(specifier, context.parentURL);
  if (rewritten) {
    const resolved = withExtension(rewritten);
    /*
      No `format`. Naming it 'module' here was the first attempt and it stopped
      type stripping dead — Node took the declaration at face value and handed
      a `.ts` file to the plain ESM parser, which died on the first `as const`.
      Leaving it off lets Node infer 'module-typescript' from the extension,
      which is the whole reason `--experimental-strip-types` is on the command.
    */
    if (resolved) return { url: resolved.href, shortCircuit: true };
  }
  return next(specifier, context);
}
