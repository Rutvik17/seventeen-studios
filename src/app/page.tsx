import { Contents } from '@/components/sections/Contents';
import { Film } from '@/components/film/Film';

/**
 * The landing: a film first — Nvidia's campus in Santa Clara, drawn, painted
 * and turned through a year — and then the sketchbook's contents. Every
 * chapter it lists is a page-turn away. The book's back endpaper, with the way
 * to reach its owner, is the footer every page shares.
 */
export default function HomePage() {
  return (
    <>
      <Film />
      <Contents />
    </>
  );
}
