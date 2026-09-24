/**
 * Serves the site's own TypeScript to a browser, so a script can draw with
 * the code the pages draw with — the globe's map and the pages' ground are painted this way
 * (`make-globe-sheet.mjs`).
 *
 *   const server = await serveScenes({ '/page.html': html });
 *   // open `${server.url}/page.html` in headless Chrome (`chrome.mjs`) …
 *   await server.close();
 *
 * Any path under /src is answered with that module compiled to plain
 * JavaScript (TypeScript's own `transpileModule`: types dropped, nothing
 * bundled), found the way the bundler finds it — `./land` is `land.ts`. The
 * pages import with the site's `@/` alias, so each should carry
 *
 *   <script type="importmap">{"imports":{"@/":"/src/"}}</script>
 *
 * Nothing here is part of the site: it runs only while a script is drawing.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The file a module path names: as written, or with `.ts` or `/index.ts` after it. */
function find(p) {
  const base = path.join(root, p);
  if (!base.startsWith(path.join(root, 'src'))) return null;
  for (const f of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

const compiled = new Map();

function compile(file) {
  if (!compiled.has(file)) {
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    compiled.set(file, outputText);
  }
  return compiled.get(file);
}

/** Starts the server; `pages` maps a path such as '/page.html' to the HTML answered there. */
export async function serveScenes(pages = {}) {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    if (pages[p]) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(pages[p]);
      return;
    }
    const file = p.startsWith('/src/') ? find(p) : null;
    if (!file) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
    res.end(file.endsWith('.ts') ? compile(file) : readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
