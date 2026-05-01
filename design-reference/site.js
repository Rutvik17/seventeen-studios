// site.js — GSAP animations, Lenis, cursor, modals
(function () {

  /* ─── Lenis Smooth Scroll ─────────────────────────────────── */
  const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ─── Custom Cursor ───────────────────────────────────────── */
  const cursorDot  = document.querySelector('.cursor-dot');
  const cursorRing = document.querySelector('.cursor-ring');
  let cx = 0, cy = 0, rx = 0, ry = 0;
  window.addEventListener('mousemove', (e) => { cx = e.clientX; cy = e.clientY; });
  (function tickCursor() {
    rx += (cx - rx) * 0.12;
    ry += (cy - ry) * 0.12;
    if (cursorDot)  cursorDot.style.transform  = `translate(${cx}px,${cy}px)`;
    if (cursorRing) cursorRing.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(tickCursor);
  })();
  document.querySelectorAll('a, button, .magnetic, .work-card, .svc-arrow, .modal-close').forEach(el => {
    el.addEventListener('mouseenter', () => cursorRing && cursorRing.classList.add('hovered'));
    el.addEventListener('mouseleave', () => cursorRing && cursorRing.classList.remove('hovered'));
  });

  /* ─── Magnetic Buttons ────────────────────────────────────── */
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top  + r.height / 2);
      gsap.to(el, { x: dx * 0.3, y: dy * 0.3, duration: 0.4, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
    });
  });

  /* ─── Split Chars (hero lines) ────────────────────────────── */
  function splitChars(el) {
    const text = el.textContent;
    el.innerHTML = '';
    el.setAttribute('aria-label', text);
    [...text].forEach(ch => {
      const s = document.createElement('span');
      s.className = 'char';
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      s.style.display = 'inline-block';
      el.appendChild(s);
    });
    return el.querySelectorAll('.char');
  }

  /* ─── Split Words — node-walk version, preserves <em> etc. ─── */
  function splitWords(el) {
    // Snapshot child nodes before clearing
    const childNodes = [...el.childNodes];
    el.innerHTML = '';
    const inners = [];

    function wrapWord(content, isElement) {
      const wrap = document.createElement('span');
      wrap.style.cssText = 'overflow:hidden;display:inline-block;vertical-align:bottom;';
      const inner = document.createElement('span');
      inner.style.cssText = 'display:inline-block;';
      if (isElement) {
        inner.appendChild(content);
      } else {
        inner.textContent = content;
      }
      wrap.appendChild(inner);
      el.appendChild(wrap);
      // Always append a trailing space — HTML collapses doubles, so safe everywhere
      el.appendChild(document.createTextNode(' '));
      inners.push(inner);
    }

    childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        // Split on whitespace; only wrap non-space parts
        const parts = node.textContent.split(/\s+/);
        parts.forEach(part => {
          if (part.length > 0) wrapWord(part, false);
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'BR') {
          // <br> is just a visual line-break; the trailing space from wrapWord handles separation
        } else {
          // Inline elements like <em>, <strong>, <span> — wrap the whole node
          wrapWord(node.cloneNode(true), true);
        }
      }
    });

    return inners;
  }

  /* ─── Hero Entrance ───────────────────────────────────────── */
  const line1 = document.getElementById('hero-line-1');
  const line2 = document.getElementById('hero-line-2');
  const heroSub  = document.querySelector('.hero-sub');
  const heroMeta = document.querySelector('.hero-meta');
  const navEl    = document.querySelector('nav');

  const chars1 = line1 ? splitChars(line1) : [];
  const chars2 = line2 ? splitChars(line2) : [];

  const tl = gsap.timeline({ delay: 0.2 });
  tl.from(navEl, { y: -30, opacity: 0, duration: 0.8, ease: 'power3.out' })
    .from(chars1, { y: '110%', opacity: 0, duration: 1.1, stagger: 0.04, ease: 'power4.out' }, '-=0.3')
    .from(chars2, { y: '110%', opacity: 0, duration: 1.1, stagger: 0.04, ease: 'power4.out' }, '-=0.85')
    .from(heroSub,  { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out' }, '-=0.5')
    .from(heroMeta, { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
    .from('.hero-scroll-hint', { opacity: 0, duration: 1 }, '-=0.2');

  /* ─── ScrollTrigger Reveals ───────────────────────────────── */
  gsap.registerPlugin(ScrollTrigger);

  gsap.utils.toArray('.reveal-up').forEach(el => {
    gsap.from(el, {
      y: 50, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  gsap.utils.toArray('.reveal-stagger').forEach(parent => {
    gsap.from(parent.children, {
      y: 50, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: parent, start: 'top 85%' }
    });
  });

  /* ─── Word reveals — run AFTER splitting ──────────────────── */
  gsap.utils.toArray('.reveal-words').forEach(el => {
    const words = splitWords(el);
    gsap.from(words, {
      y: '105%', opacity: 0, duration: 1, stagger: 0.07, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  /* ─── Count-up numbers ────────────────────────────────────── */
  gsap.utils.toArray('.count-up').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to({ val: 0 }, {
        val: target, duration: 1.8, ease: 'power2.out',
        onUpdate: function () { el.textContent = Math.round(this.targets()[0].val); }
      })
    });
  });

  /* ─── Horizontal Work Scroll ──────────────────────────────── */
  const workTrack = document.querySelector('.work-track');
  if (workTrack) {
    const getWidth = () => workTrack.scrollWidth - window.innerWidth;
    gsap.to(workTrack, {
      x: () => -getWidth(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.work-section',
        start: 'top top',
        end: () => `+=${getWidth() + window.innerWidth * 0.5}`,
        scrub: 1.2, pin: true, anticipatePin: 1,
        invalidateOnRefresh: true,
      }
    });

    // Card tilt on hover
    document.querySelectorAll('.work-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width  - 0.5;
        const dy = (e.clientY - r.top)  / r.height - 0.5;
        gsap.to(card, { rotateY: dx * 10, rotateX: -dy * 6, duration: 0.4, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.7, ease: 'elastic.out(1,0.5)' });
      });
    });
  }

  /* ─── Letter Scramble ─────────────────────────────────────── */
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function scramble(el, original) {
    let iter = 0;
    const interval = setInterval(() => {
      el.textContent = original.split('').map((ch, i) =>
        i < iter ? original[i] :
        ch === ' ' ? ' ' : LETTERS[Math.floor(Math.random() * LETTERS.length)]
      ).join('');
      if (iter >= original.length) clearInterval(interval);
      iter += 1 / 2.5;
    }, 30);
  }
  document.querySelectorAll('[data-scramble]').forEach(el => {
    const orig = el.textContent;
    el.addEventListener('mouseenter', () => scramble(el, orig));
  });

  /* ─── Modal System ────────────────────────────────────────── */
  function openModal(id) {
    const overlay = document.getElementById('modal-' + id);
    if (!overlay) return;
    // Scroll to top of modal content
    const box = overlay.querySelector('.modal-box');
    if (box) box.scrollTop = 0;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    lenis.stop();
  }

  function closeModal(overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    lenis.start();
  }

  // Close buttons inside modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay')));
  });

  // Click on overlay backdrop
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(closeModal);
    }
  });

  // Service card arrows
  document.querySelectorAll('.svc-arrow[data-modal]').forEach(arrow => {
    arrow.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(arrow.dataset.modal);
    });
  });

  // Work cards
  document.querySelectorAll('.work-card[data-modal]').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.modal));
  });

  /* ─── Active nav on scroll ────────────────────────────────── */
  document.querySelectorAll('section[id]').forEach(sec => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: ({ isActive }) => {
        const link = document.querySelector(`nav a[href="#${sec.id}"]`);
        if (link) link.classList.toggle('active', isActive);
      }
    });
  });

  /* ─── Tweaks ──────────────────────────────────────────────── */
  window.addEventListener('message', (e) => {
    if (e.data?.type === '__activate_edit_mode')   document.querySelector('.tweaks-panel')?.classList.add('open');
    if (e.data?.type === '__deactivate_edit_mode') document.querySelector('.tweaks-panel')?.classList.remove('open');
  });
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');

  document.querySelectorAll('.tweak-accent').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.documentElement.style.setProperty('--accent', swatch.dataset.color);
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { accent: swatch.dataset.color } }, '*');
    });
  });

  document.getElementById('tweak-density')?.addEventListener('input', function () {
    document.documentElement.style.setProperty('--noise-opacity', this.value / 100);
  });

})();
