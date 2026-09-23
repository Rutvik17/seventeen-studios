import type { ReactNode } from 'react';

/**
 * A page of the sketchbook: gridded paper, a margin rule, a handwritten note at
 * the top and a title under it. Every simple page on the site is one of these,
 * so the notebook and the 404 read as leaves of the same book as the landing
 * and the founder page.
 */
export function Sheet({
  kicker,
  title,
  lead,
  children,
}: {
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="sheet">
      <header className="sheet__head">
        <p className="sheet__kicker">{kicker}</p>
        <h1 className="sheet__title">{title}</h1>
        {lead && <div className="sheet__lead">{lead}</div>}
      </header>
      {children}
    </div>
  );
}
