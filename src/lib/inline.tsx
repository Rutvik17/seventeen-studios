import { Fragment, type ReactNode } from 'react';

/**
 * Minimal inline markup for authored content.
 *
 *   *accent*  → accent-coloured span
 *   _italic_  → <em>
 *   `mono`    → inline code
 *
 * Deliberately tiny: a full markdown parser would be a dependency and a
 * sanitisation surface for three constructs the studio actually uses.
 */

// `**double**` is accepted as well as `*single*` so a stray markdown habit in
// the content files degrades to the right emphasis instead of leaking asterisks.
const PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;

export function inline(text: string): ReactNode {
  const parts = text.split(PATTERN);
  return parts.map((part, index) => {
    const key = `${index}-${part.slice(0, 8)}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <span className="accent" key={key}>
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <span className="accent" key={key}>
          {part.slice(1, -1)}
        </span>
      );
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

/** Strip markup for metadata, aria-labels and anywhere plain text is needed. */
export function plain(text: string): string {
  return text.replace(/[*_`]/g, '');
}
