'use client';

/**
 * The closing line, lit by the pointer.
 *
 * Left alone it runs a slow band of the site's blue along the words every few
 * seconds. Under the pointer it stops doing that and the blue goes wherever the
 * cursor is instead — a soft light travelling through the glyphs and picking out
 * whichever word is being looked at.
 *
 * ---
 *
 * WHY IT IS A GRADIENT AND NOT A SHADER
 *
 * It reads like one, and the page already has a WebGL context a few hundred
 * pixels above it. A second one for a text effect would mean another canvas to
 * size, another loop to pause when it scrolls out of view, and text that is no
 * longer text — unselectable, unsearchable, invisible to a screen reader.
 *
 * `background-clip: text` over a radial gradient gets the same look out of the
 * real glyphs, costs nothing, and degrades to flat ink where it is unsupported.
 *
 * ---
 *
 * THE POSITION IS WRITTEN STRAIGHT TO THE ELEMENT
 *
 * `setProperty` on the node rather than React state. A pointer move fires on
 * every frame the mouse is in motion, and routing that through a re-render
 * would rebuild the split heading sixty times a second to change two numbers.
 * The same reason the scroll progress upstairs lives in a ref.
 */

import { useRef } from 'react';
import { SplitText } from '@/components/motion/SplitText';
import styles from '@/components/founder/Founder.module.css';

export function OutroLine({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const track = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <div
      ref={ref}
      className={styles.resumeLineWrap}
      onPointerMove={track}
      onPointerEnter={(event) => {
        // Seed the position on entry, so the light appears under the cursor
        // rather than at the middle and sliding over.
        track(event);
        ref.current?.setAttribute('data-lit', '');
      }}
      onPointerLeave={() => ref.current?.removeAttribute('data-lit')}
    >
      {/*
        Word by word rather than character by character. These are real words
        doing real work, and cascading them a letter at a time reads as an
        effect happening TO the sentence rather than the sentence arriving.
      */}
      {/*
        NO `depth` HERE, AND IT IS NOT AN OVERSIGHT.

        `depth` puts `perspective` and `transform-style: preserve-3d` on the
        heading itself and rotates each word in that space. This heading is also
        the element the gradient is clipped to — and WebKit has a long-standing
        habit of dropping `-webkit-background-clip: text` when the clipped
        element is a 3D rendering context, painting nothing at all.

        Two effects, one element, and one of them can silently delete the other.
        The sweep is the distinctive one and the one that was asked for; the
        hinge is a reveal this site uses in a dozen other places where nothing is
        clipped. So the words slide up instead.
      */}
      <SplitText
        as="h2"
        className={styles.resumeLine}
        mode="words"
        trigger="scroll"
        stagger={0.055}
      >
        {text}
      </SplitText>
    </div>
  );
}
