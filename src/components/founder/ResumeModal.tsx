'use client';

/**
 * Résumé viewer.
 *
 * A single control carrying both affordances — view and download — over one
 * label, then a modal that renders the résumé as a sheet of paper: light stock
 * against the dark page, which is the one place on the site where the palette
 * inverts. The inversion is the point; it reads as a physical document handed
 * across rather than another dark panel.
 *
 * The document is rendered from `content/resume.ts`, the same data the PDF and
 * the .docx are generated from, so what a visitor reads is what an employer
 * receives.
 *
 * Behaviour: Escape closes, the backdrop closes, focus is trapped while open
 * and returned to the trigger on close, and page scroll is locked.
 *
 * The dialog is portalled to <body>. It has to be: the trigger sits inside a
 * Reveal wrapper, GSAP puts a transform on that wrapper, and a transformed
 * ancestor becomes the containing block for `position: fixed` — so rendered in
 * place the overlay sized itself to the button row instead of the viewport.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { lockScroll, unlockScroll } from '@/lib/lenis';
import { asset } from '@/lib/asset';
import { resetCursor } from '@/lib/cursor';
import {
  resumeHeader,
  resumeSummary,
  resumeSkills,
  resumeExperience,
  resumeProjects,
  resumeEducation,
} from '@/content/resume';

const PDF = asset('/founder/rutvik-patel-resume.pdf');
const DOCX = asset('/founder/rutvik-patel-resume.docx');

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 3v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="m7.5 10 4.5 4.5L16.5 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ResumeControl() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    // The close button is removed from the document by this very state change,
    // so it never gets a `pointerout` — without this the ring stays stuck
    // reading "Close" over the page behind the dialog.
    resetCursor();
    // Send focus back where it came from, or the control is lost to keyboards.
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <div className="resume-control">
        <span className="resume-control__label mono-label">Résumé</span>
        <button
          type="button"
          className="resume-control__action"
          ref={triggerRef}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          data-cursor="View"
        >
          <EyeIcon />
          <span className="sr-only">View résumé</span>
        </button>
        <a
          className="resume-control__action"
          href={PDF}
          download
          data-cursor="Download"
        >
          <DownloadIcon />
          <span className="sr-only">Download résumé as PDF</span>
        </a>
      </div>

      {open ? <ResumeDialogPortal onClose={close} /> : null}
    </>
  );
}

function ResumeDialogPortal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<ResumeDialog onClose={onClose} />, document.body);
}

function ResumeDialog({ onClose }: { onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape, and a focus trap across the dialog's tabbable elements.
  useEffect(() => {
    lockScroll();
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const root = rootRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [onClose]);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const sheet = sheetRef.current;
    if (!root || !sheet) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .fromTo(
          '.resume-modal__scrim',
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: 'power2.out' },
        )
        .fromTo(
          sheet,
          // Clipped from the bottom rather than scaled: the sheet reads as
          // being drawn out of the page, and text never scales blurrily.
          { clipPath: 'inset(100% 0% 0% 0%)', y: 60 },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            y: 0,
            duration: 0.85,
            ease: 'power4.out',
          },
          '-=0.2',
        )
        .fromTo(
          '.resume-doc__stagger',
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.035, ease: 'power3.out' },
          '-=0.5',
        )
        .fromTo(
          '.resume-modal__scan',
          { scaleY: 0, opacity: 1 },
          { scaleY: 1, duration: 0.7, ease: 'power2.inOut' },
          '-=0.75',
        )
        .to('.resume-modal__scan', { opacity: 0, duration: 0.3 }, '-=0.1');
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div className="resume-modal" ref={rootRef} role="presentation">
      <button
        type="button"
        className="resume-modal__scrim"
        onClick={onClose}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div
        className="resume-modal__sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Résumé — ${resumeHeader.name}`}
      >
        <span className="resume-modal__scan" aria-hidden="true" />

        <header className="resume-modal__bar">
          <span className="mono-label">Résumé · {resumeHeader.name}</span>
          <div className="resume-modal__bar-actions">
            <a className="resume-modal__pill" href={PDF} download data-cursor="PDF">
              PDF
            </a>
            <a className="resume-modal__pill" href={DOCX} download data-cursor="DOCX">
              DOCX
            </a>
            <button
              type="button"
              className="resume-modal__close"
              onClick={onClose}
              ref={closeRef}
              data-cursor="Close"
            >
              <span aria-hidden="true">✕</span>
              <span className="sr-only">Close résumé</span>
            </button>
          </div>
        </header>

        {/* `data-lenis-prevent`, same as the index overlay: the dialog stops
            Lenis while it is open, and a stopped Lenis still swallows the
            wheel and touch events, so without this the sheet cannot scroll. */}
        <div className="resume-modal__scroll" data-lenis-prevent>
          <article className="resume-doc">
            <header className="resume-doc__head resume-doc__stagger">
              <h2 className="resume-doc__name">{resumeHeader.name}</h2>
              <p className="resume-doc__title">{resumeHeader.title}</p>
              <p className="resume-doc__contact">
                {resumeHeader.location} · {resumeHeader.phone} ·{' '}
                <a href={`mailto:${resumeHeader.email}`}>{resumeHeader.email}</a>
              </p>
              <p className="resume-doc__contact">
                {resumeHeader.linkedin} · {resumeHeader.github} · {resumeHeader.site}
              </p>
            </header>

            <section className="resume-doc__stagger">
              <h3 className="resume-doc__section">Summary</h3>
              <p className="resume-doc__body">{resumeSummary}</p>
            </section>

            <section className="resume-doc__stagger">
              <h3 className="resume-doc__section">Technical Skills</h3>
              <dl className="resume-doc__skills">
                {resumeSkills.map((group) => (
                  <div key={group.group}>
                    <dt>{group.group}</dt>
                    <dd>{group.items.join(', ')}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section>
              <h3 className="resume-doc__section resume-doc__stagger">
                Professional Experience
              </h3>
              {resumeExperience.map((role) => (
                <div className="resume-doc__role resume-doc__stagger" key={role.company}>
                  <div className="resume-doc__role-head">
                    <span className="resume-doc__company">
                      {role.company} — {role.location}
                    </span>
                    <span className="resume-doc__dates">
                      {role.start} – {role.end}
                    </span>
                  </div>
                  <p className="resume-doc__position">{role.role}</p>
                  <p className="resume-doc__context">{role.context}</p>
                  <ul className="resume-doc__bullets">
                    {role.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <section>
              <h3 className="resume-doc__section resume-doc__stagger">Selected Projects</h3>
              {resumeProjects.map((project) => (
                <div className="resume-doc__role resume-doc__stagger" key={project.name}>
                  <div className="resume-doc__role-head">
                    <span className="resume-doc__company">
                      {project.name} — {project.link}
                    </span>
                    <span className="resume-doc__dates">{project.period}</span>
                  </div>
                  <p className="resume-doc__position">{project.role}</p>
                  <ul className="resume-doc__bullets">
                    {project.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <section className="resume-doc__stagger">
              <h3 className="resume-doc__section">Education</h3>
              <div className="resume-doc__role-head">
                <span className="resume-doc__company">
                  {resumeEducation.school} — {resumeEducation.location}
                </span>
                <span className="resume-doc__dates">{resumeEducation.date}</span>
              </div>
              <p className="resume-doc__body">{resumeEducation.credential}</p>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}
