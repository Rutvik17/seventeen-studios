/**
 * Headless Chrome, for the scripts that need a real browser: `build-og.mjs`
 * renders the share cards in one, and `make-globe-data.mjs` decodes a
 * satellite picture with one (Node has no JPEG decoder; a browser does).
 *
 *   const page = await openPage({ width: 1200, height: 630 });
 *   await page.navigate(url);
 *   const value = await page.evaluate('1 + 1');
 *   const png = await page.screenshot();
 *   await page.close();
 *
 * Talks to Chrome over the DevTools protocol on one socket — a few dozen
 * lines rather than a dependency, because this is all any script here needs.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error('No Chrome found. Set CHROMIUM_PATH to a Chrome or Chromium executable.');
  return found;
}

/** Minimal CDP client — one socket, promise per message id. */
class Devtools {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      this.listeners.forEach((listen) => listen(msg));
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);
      msg.error ? entry.reject(new Error(msg.error.message)) : entry.resolve(msg.result);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
}

async function waitForEndpoint(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      /* not listening yet */
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error('Chrome did not open a debugging port.');
}

/** A `file:///` URL for a path on disk. */
export function fileUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/').replace(/^\//, '');
}

/**
 * One page in a fresh headless Chrome, `width` × `height` at `scale` device
 * pixels per CSS pixel — asking for reduced motion when `reducedMotion` is set.
 */
export async function openPage({ width, height, scale = 1, reducedMotion = false }) {
  const profile = mkdtempSync(path.join(os.tmpdir(), 'chrome-profile-'));
  const port = 9400 + Math.floor(Math.random() * 400);
  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      `--force-device-scale-factor=${scale}`,
      '--font-render-hinting=none',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const close = async () => {
    chrome.kill();
    /*
      Best effort. Chrome's crash handler holds a lock on the profile for a
      moment after the process is signalled, and on Windows that surfaces as
      EBUSY — which would otherwise fail a run whose work had all been done.
      It is a temp directory; the OS reclaims it.
    */
    await new Promise((r) => setTimeout(r, 200));
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* left for the OS */
    }
  };

  try {
    const socket = new WebSocket(await waitForEndpoint(port));
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    const cdp = new Devtools(socket);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false }, sessionId);
    if (reducedMotion) {
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);
    }

    const errors = [];
    cdp.listeners.add((msg) => {
      if (msg.sessionId === sessionId && msg.method === 'Runtime.exceptionThrown') {
        errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
      }
    });

    return {
      /** Exceptions thrown in the page so far. */
      errors,
      async navigate(url) {
        const loaded = new Promise((resolve) => {
          const listen = (msg) => {
            if (msg.sessionId === sessionId && msg.method === 'Page.loadEventFired') {
              cdp.listeners.delete(listen);
              resolve();
            }
          };
          cdp.listeners.add(listen);
        });
        await cdp.send('Page.navigate', { url }, sessionId);
        await loaded;
      },
      /** The value of `expression` in the page, awaited if it is a promise. */
      async evaluate(expression) {
        const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
        if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
        return result.value;
      },
      /** A PNG of the page, or of `clip` ({ x, y, width, height }). */
      async screenshot(clip) {
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }, sessionId);
        return Buffer.from(shot.data, 'base64');
      },
      async close() {
        socket.close();
        await close();
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
