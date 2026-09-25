import type { Metadata } from 'next';
import Link from 'next/link';
import { SendOn } from '@/components/algorithms/SendOn';

/**
 * The notebook became the algorithms section. Old links land here and are
 * sent on — a static export has no server to answer with a redirect, so the
 * page does it: the router sends the visitor on, and a plain link catches
 * anyone without the script.
 */
export const metadata: Metadata = {
  title: 'Algorithms',
  robots: { index: false, follow: true },
  alternates: { canonical: '/algorithms/' },
};

export default function NotebookMoved() {
  return (
    <main style={{ padding: '140px var(--gutter)', fontFamily: 'var(--font-hand), cursive', fontSize: 24 }}>
      <SendOn to="/algorithms/" />
      <p>
        This page is now <Link href="/algorithms/">Algorithms</Link>.
      </p>
    </main>
  );
}
