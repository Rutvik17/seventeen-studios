/**
 * Shared GSAP helpers — split-text utilities used across multiple sections.
 *
 * The reveal timelines themselves live inside the components that own the
 * DOM nodes (Hero, Work, etc.) — this module only exposes the pure DOM
 * transforms so they can be reused.
 */

/**
 * Replace an element's text with per-character spans and return the spans.
 * Non-breaking space is substituted for regular spaces so the animation
 * maintains spacing.
 */
export function splitChars(el: HTMLElement): HTMLSpanElement[] {
  const text = el.textContent ?? '';
  el.innerHTML = '';
  el.setAttribute('aria-label', text);

  const chars: HTMLSpanElement[] = [];
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    span.style.display = 'inline-block';
    el.appendChild(span);
    chars.push(span);
  }
  return chars;
}

/**
 * Wrap each word of an element in an overflow-hidden span, returning the
 * inner (animatable) spans. Preserves inline elements like `<em>` and
 * `<strong>` by wrapping the element as a single word.
 */
export function splitWords(el: HTMLElement): HTMLSpanElement[] {
  const childNodes = Array.from(el.childNodes);
  el.innerHTML = '';
  const inners: HTMLSpanElement[] = [];

  const wrapWord = (content: string | Node, isElement: boolean) => {
    const wrap = document.createElement('span');
    wrap.style.cssText =
      'overflow:hidden;display:inline-block;vertical-align:bottom;';
    const inner = document.createElement('span');
    inner.style.cssText = 'display:inline-block;';
    if (isElement && content instanceof Node) {
      inner.appendChild(content);
    } else {
      inner.textContent = content as string;
    }
    wrap.appendChild(inner);
    el.appendChild(wrap);
    // Trailing whitespace between wrapped words (HTML collapses doubles).
    el.appendChild(document.createTextNode(' '));
    inners.push(inner);
  };

  childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = (node.textContent ?? '').split(/\s+/);
      parts.forEach((part) => {
        if (part.length > 0) wrapWord(part, false);
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName;
      if (tag === 'BR') {
        // Line-breaks are implicit — the trailing space keeps separation.
        return;
      }
      wrapWord(node.cloneNode(true), true);
    }
  });

  return inners;
}

const SCRAMBLE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Run a letter-scramble effect on the given element, cycling each character
 * through random uppercase alphanumerics until the original string is fully
 * revealed. Returns the interval id so callers can cancel early.
 */
export function scrambleText(el: HTMLElement, original: string): number {
  let iter = 0;
  const interval = window.setInterval(() => {
    el.textContent = original
      .split('')
      .map((ch, i) => {
        if (i < iter) return original[i];
        if (ch === ' ') return ' ';
        return SCRAMBLE_LETTERS[
          Math.floor(Math.random() * SCRAMBLE_LETTERS.length)
        ];
      })
      .join('');
    if (iter >= original.length) {
      window.clearInterval(interval);
    }
    iter += 1 / 2.5;
  }, 30);
  return interval;
}
