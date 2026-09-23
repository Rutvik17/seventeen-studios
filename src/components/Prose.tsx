/**
 * Renders authored `Block[]` content — the legal pages' paragraphs and
 * headings. No markdown parser and no `dangerouslySetInnerHTML`: the content
 * vocabulary is two kinds of block, so this stays exhaustive and type-checked.
 */

import type { Block } from '@/content/types';

export function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose">
      {blocks.map((block, index) => (block.type === 'h2' ? <h2 key={index}>{block.text}</h2> : <p key={index}>{block.text}</p>))}
    </div>
  );
}
