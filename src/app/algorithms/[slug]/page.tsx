import type { Metadata } from 'next';
import Link from 'next/link';
import { problems, problem } from '@/content/algorithms';
import { readCode, readSpec, examples } from '@/lib/algorithms/solutions';
import { ogImage } from '@/lib/og';
import { Rich } from '@/components/algorithms/Rich';
import { CodeTabs } from '@/components/algorithms/CodeTabs';
import { Visualizer } from '@/components/algorithms/Visualizer';
import styles from '@/components/algorithms/Algorithms.module.css';

export function generateStaticParams() {
  return problems.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = problem(params.slug);
  const description = `${p.title} (LeetCode ${p.number}, ${p.difficulty}) — the problem, the idea, a step-by-step visualisation, and the solution in Python, JavaScript, Java, C++, C# and Rust.`;
  return {
    title: `${p.title} — Algorithms`,
    description,
    openGraph: { title: `${p.title} — step by step`, description, images: ogImage('algorithms-problem', 'A problem from the NeetCode 150 beside the list of all of them, its solution drawn step by step') },
  };
}

export default function ProblemPage({ params }: { params: { slug: string } }) {
  const p = problem(params.slug);
  const spec = readSpec(p.slug);
  const ex = examples(spec);
  const code = readCode(p.slug);
  const i = problems.findIndex((x) => x.slug === p.slug);
  const prev = problems[i - 1];
  const next = problems[i + 1];

  return (
    <div className={styles.problem}>
      <article className={styles.statement}>
        <p className={styles.kicker}>
          <span>{p.categoryTitle}</span>
          <span className={styles[`tag${p.difficulty}`]}>{p.difficulty}</span>
          <a href={`https://leetcode.com/problems/${p.slug}/`} target="_blank" rel="noreferrer noopener">
            LeetCode {p.number} ↗
          </a>
        </p>
        <h1 className={styles.title}>{p.title}</h1>
        {p.statement.map((s, k) => (
          <p key={k} className={styles.para}>
            <Rich text={s} />
          </p>
        ))}
        <div className={styles.examples}>
          {ex.map((e, k) => (
            <div key={k} className={styles.exampleBox}>
              <p className={styles.exampleTitle}>Example {k + 1}</p>
              <pre>
                <b>Input</b> {e.input}
                {'\n'}
                <b>Output</b> {e.output}
              </pre>
            </div>
          ))}
        </div>
        <h2 className={styles.h2}>Constraints</h2>
        <ul className={styles.constraints}>
          {p.constraints.map((c, k) => (
            <li key={k}>
              <Rich text={c} />
            </li>
          ))}
        </ul>
      </article>

      <aside className={styles.vizCol} aria-label="Visualisation">
        <Visualizer slug={p.slug} category={p.category} examples={ex.map((e) => ({ label: e.calls ?? e.input.replace(/\n/g, '  '), input: e.raw }))} />
      </aside>

      <article className={styles.solution}>
        <h2 className={styles.h2}>The idea</h2>
        {p.idea.map((s, k) => (
          <p key={k} className={styles.para}>
            <Rich text={s} />
          </p>
        ))}
        <dl className={styles.cost}>
          <div>
            <dt>Time</dt>
            <dd>{p.complexity.time}</dd>
          </div>
          <div>
            <dt>Space</dt>
            <dd>{p.complexity.space}</dd>
          </div>
        </dl>
        <h2 className={styles.h2}>Solution</h2>
        <CodeTabs code={code} />
        <nav className={styles.pager} aria-label="Neighbouring problems">
          {prev ? (
            <Link href={`/algorithms/${prev.slug}/`} prefetch={false}>
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/algorithms/${next.slug}/`} prefetch={false}>
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </div>
  );
}
