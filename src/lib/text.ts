/**
 * DOM text-splitting utilities used by the reveal animations.
 *
 * All of these run client-side only, after hydration: the server renders the
 * plain string so the content is present for crawlers and for users whose JS
 * never arrives, and the split happens in an effect.
 */

/** Wrap each character in an inline-block span. Returns the spans. */
export function splitChars(el: HTMLElement): HTMLSpanElement[] {
  const text = el.textContent ?? '';
  el.setAttribute('aria-label', text);
  el.innerHTML = '';

  const chars: HTMLSpanElement[] = [];
  for (const ch of Array.from(text)) {
    const span = document.createElement('span');
    span.className = 'char';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = ch === ' ' ? ' ' : ch;
    el.appendChild(span);
    chars.push(span);
  }
  return chars;
}

/**
 * Wrap each word in an overflow-hidden mask with an inner animatable span.
 * Inline elements (`<em>`, `<strong>`) are preserved as single words.
 */
export function splitWords(el: HTMLElement): HTMLSpanElement[] {
  const source = Array.from(el.childNodes);
  const label = el.textContent ?? '';
  el.setAttribute('aria-label', label);
  el.innerHTML = '';

  const inners: HTMLSpanElement[] = [];

  const append = (content: string | Node) => {
    const mask = document.createElement('span');
    mask.className = 'word-mask';
    mask.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.className = 'word';
    if (typeof content === 'string') inner.textContent = content;
    else inner.appendChild(content);
    mask.appendChild(inner);
    el.appendChild(mask);
    el.appendChild(document.createTextNode(' '));
    inners.push(inner);
  };

  source.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      (node.textContent ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .forEach((word) => append(word));
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node as Element).tagName === 'BR') return;
      append(node.cloneNode(true));
    }
  });

  return inners;
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*';

/**
 * Letter-scramble reveal. Returns a cancel function so hover-out can stop the
 * interval mid-flight instead of leaving a half-scrambled string on screen.
 */
export function scramble(
  el: HTMLElement,
  original: string,
  speed = 2.5,
): () => void {
  let frame = 0;
  const id = window.setInterval(() => {
    el.textContent = Array.from(original)
      .map((ch, i) => {
        if (i < frame) return ch;
        if (ch === ' ') return ' ';
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      })
      .join('');
    if (frame >= original.length) window.clearInterval(id);
    frame += 1 / speed;
  }, 28);

  return () => {
    window.clearInterval(id);
    el.textContent = original;
  };
}
