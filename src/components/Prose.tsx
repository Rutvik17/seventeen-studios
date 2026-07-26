/**
 * Renders authored `Block[]` content.
 *
 * One switch, no markdown parser, no `dangerouslySetInnerHTML` — the content
 * vocabulary is small enough that this stays exhaustive and type-checked.
 */

import type { Block } from '@/content/types';
import { inline } from '@/lib/inline';

export function Prose({
  blocks,
  className,
}: {
  blocks: Block[];
  className?: string;
}) {
  return (
    <div className={`prose ${className ?? ''}`.trim()}>
      {blocks.map((block, index) => (
        <ProseBlock block={block} key={index} />
      ))}
    </div>
  );
}

function ProseBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <p>{inline(block.text)}</p>;

    case 'h2':
      return <h2>{inline(block.text)}</h2>;

    case 'h3':
      return <h3>{inline(block.text)}</h3>;

    case 'quote':
      return (
        <blockquote>
          <p>{inline(block.text)}</p>
          {block.attribution ? (
            <cite className="mono-label">{block.attribution}</cite>
          ) : null}
        </blockquote>
      );

    case 'list': {
      const items = block.items.map((item, index) => (
        <li key={index}>{inline(item)}</li>
      ));
      return block.ordered ? (
        <ol className="prose__list">{items}</ol>
      ) : (
        <ul className="prose__list">{items}</ul>
      );
    }

    case 'defs':
      return (
        <dl className="prose__defs">
          {block.items.map((item, index) => (
            <div className="prose__def" key={index}>
              <dt>{inline(item.term)}</dt>
              <dd>{inline(item.description)}</dd>
            </div>
          ))}
        </dl>
      );

    case 'note':
      return (
        <aside className="prose__note">
          <span className="mono-label">{block.label}</span>
          <p>{inline(block.text)}</p>
        </aside>
      );

    case 'code':
      return (
        <div className="prose__code">
          <span className="mono-label">{block.language}</span>
          <pre>
            <code>{block.code}</code>
          </pre>
        </div>
      );

    default:
      return null;
  }
}
