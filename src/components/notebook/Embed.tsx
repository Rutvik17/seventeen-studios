'use client';

import dynamic from 'next/dynamic';
import type { EmbedId } from '@/content/types';

/**
 * Mounts an interactive piece inside authored prose.
 *
 * ---
 *
 * WHY A LOOKUP AND NOT A COMPONENT IN THE CONTENT
 *
 * Content is data (rule 3) and data has to stay serialisable. A notebook entry
 * says `{ type: 'embed', component: 'board3d' }` — a string — and this file is
 * the only place that knows what that string means. Putting the component
 * itself in the content file would make the content module import React, drag
 * three.js into every page that lists entries, and stop the content being
 * something a script could read.
 *
 * ---
 *
 * EVERYTHING HERE IS LOADED ON DEMAND
 *
 * Each embed is a `dynamic()` import with `ssr: false`. Three.js alone is about
 * 150 KB; an article that mentions the board should not make a reader who never
 * scrolls to it pay for a renderer. `ssr: false` because these all touch the
 * canvas or the window during mount, and a static export would otherwise try to
 * render them at build time and fail.
 *
 * The placeholder reserves real height. Without it the article's layout jumps
 * when a chunk lands, which throws the reader's place and — if they are
 * mid-scroll — moves the thing they were reading out from under them.
 */

const Placeholder = ({ label }: { label: string }) => (
  <div className="embed__placeholder">
    <span className="mono-label">{label}</span>
  </div>
);

const BoardExplorer = dynamic(
  () => import('./BoardExplorer').then((m) => m.BoardExplorer),
  { ssr: false, loading: () => <Placeholder label="Loading the board…" /> },
);

const TraceWidth = dynamic(
  () => import('./TraceWidth').then((m) => m.TraceWidth),
  { ssr: false, loading: () => <Placeholder label="Loading the calculator…" /> },
);

const DerivativeInstrument = dynamic(
  () =>
    import('@/components/instruments/DerivativeInstrument').then(
      (m) => m.DerivativeInstrument,
    ),
  { ssr: false, loading: () => <Placeholder label="Loading the curve…" /> },
);

const RiskInstrument = dynamic(
  () => import('@/components/instruments/RiskInstrument').then((m) => m.RiskInstrument),
  { ssr: false, loading: () => <Placeholder label="Loading the simulation…" /> },
);

const RigDemo = dynamic(
  () => import('@/components/instruments/RigDemo').then((m) => m.RigDemo),
  { ssr: false, loading: () => <Placeholder label="Loading the rig…" /> },
);

export function Embed({ component }: { component: EmbedId }) {
  switch (component) {
    case 'board3d':
      return <BoardExplorer />;
    case 'trace-width':
      return <TraceWidth />;
    case 'derivative':
      return <DerivativeInstrument />;
    case 'risk':
      return <RiskInstrument />;
    case 'spring':
      return <RigDemo />;
    default:
      return null;
  }
}
