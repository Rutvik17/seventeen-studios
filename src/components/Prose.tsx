/**
 * Renders authored `Block[]` content.
 *
 * One switch, no markdown parser, no `dangerouslySetInnerHTML` — the content
 * vocabulary is small enough that this stays exhaustive and type-checked.
 */

import type { Block } from '@/content/types';
import { inline } from '@/lib/inline';
import { Embed } from '@/components/notebook/Embed';

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

    /*
      A word the reader is not assumed to know.

      Rendered as a distinct object rather than as a parenthetical inside a
      sentence, because the point is that it cannot be skipped: a parenthetical
      is easy to leave out when you are writing quickly and know the subject,
      and the reader who needed it has no way to know it was missing.
    */
    case 'term':
      return (
        <dl className="prose__term">
          <dt>{block.word}</dt>
          <dd>{inline(block.plain)}</dd>
        </dl>
      );

    /*
      An equation, in the order the teaching rule demands: words, then symbols,
      then every symbol named, then the same expression with real numbers in it.

      The order is not a style choice. A reader who has never seen the notation
      gets a full English sentence before a single Greek letter appears; a reader
      who has can skip to the symbols. Both are served, and neither is asked to
      take a bare result on trust — `substituted` and `result` are printed
      separately so the arithmetic can be checked on a calculator.
    */
    case 'equation':
      return (
        <figure className="equation">
          <p className="equation__words">{inline(block.words)}</p>
          <p className="equation__symbols">{block.symbols}</p>
          <dl className="equation__where">
            {block.where.map((w) => (
              <div key={w.symbol}>
                <dt>{w.symbol}</dt>
                <dd>{inline(w.means)}</dd>
              </div>
            ))}
          </dl>
          {block.substituted && (
            <p className="equation__substituted">
              {block.substituted}
              {block.result ? (
                <>
                  {' '}
                  <span className="equation__result">= {block.result}</span>
                </>
              ) : null}
            </p>
          )}
          {block.soWhat && (
            <figcaption className="equation__so-what">{inline(block.soWhat)}</figcaption>
          )}
        </figure>
      );

    case 'embed':
      return (
        <div className="prose__embed">
          <Embed component={block.component} />
          {block.caption && (
            <p className="prose__embed-caption mono-label">{block.caption}</p>
          )}
        </div>
      );

    default:
      return null;
  }
}
