import type { ReactNode } from 'react';
import { Reveal } from './motion/Reveal';

/**
 * The consistent section opener: a numbered mono label on a hairline, an
 * optional lead sentence, and an optional action on the right.
 */
export function SectionHeader({
  index,
  label,
  title,
  action,
}: {
  index: string;
  label: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Reveal className="section-header">
      <div className="section-header__top">
        <span className="mono-label section-header__index">{index}</span>
        <span className="mono-label">{label}</span>
        {action ? <div className="section-header__action">{action}</div> : null}
      </div>
      {title ? <div className="section-header__title">{title}</div> : null}
    </Reveal>
  );
}
