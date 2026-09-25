'use client';

/**
 * The solution in every language, one tab each, coloured at build time. The
 * language chosen is remembered for the next problem (in this browser only).
 */

import { useEffect, useState } from 'react';
import styles from './Algorithms.module.css';

interface Code {
  id: string;
  label: string;
  src: string;
  html: string;
}

const KEY = 'algorithms:lang';

export function CodeTabs({ code }: { code: Code[] }) {
  const [lang, setLang] = useState(code[0]?.id);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && code.some((c) => c.id === saved)) setLang(saved);
    } catch {
      /* no storage: the first language it is */
    }
  }, [code]);

  const choose = (id: string) => {
    setLang(id);
    setCopied(false);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* not remembered, and that is fine */
    }
  };

  const shown = code.find((c) => c.id === lang) ?? code[0];
  if (!shown) return null;

  return (
    <div className={styles.code}>
      <div className={styles.tabs} role="tablist" aria-label="Language">
        {code.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={c.id === shown.id} className={styles.tab} data-row onClick={() => choose(c.id)}>
            {c.label}
          </button>
        ))}
        <button
          type="button"
          className={styles.copy}
          onClick={() => {
            navigator.clipboard?.writeText(shown.src).then(() => setCopied(true), () => {});
          }}
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className={styles.pre} role="tabpanel" aria-label={`${shown.label} solution`}>
        <code dangerouslySetInnerHTML={{ __html: shown.html }} />
      </pre>
    </div>
  );
}
