import type { ReactNode } from 'react';

/**
 * A page of the sketchbook: gridded paper, a margin rule, a handwritten note at
 * the top and a title under it. Every simple page on the site is one of these,
 * so the notebook, contact, the legal pages and the 404 all read as leaves of
 * the same book as the landing and the founder page.
 */
export function Sheet({
  kicker,
  title,
  lead,
  children,
  className,
  titleAs: Title = 'h1',
}: {
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
  titleAs?: 'h1' | 'h2';
}) {
  return (
    <div className={`sheet${className ? ` ${className}` : ''}`}>
      <header className="sheet__head">
        <p className="sheet__kicker">{kicker}</p>
        <Title className="sheet__title">{title}</Title>
        {lead && <div className="sheet__lead">{lead}</div>}
      </header>
      {children}
    </div>
  );
}
