import type { Service } from './types';

export const services: Service[] = [
  {
    id: 'product',
    index: '01',
    title: 'Product Engineering',
    summary: 'Zero to one, and one to reliable.',
    body: 'We build the product itself — the domain model, the services behind it, the interface in front of it. Whether it is a first version that has to earn the next round of funding or a rebuild of the thing already carrying your revenue, the work ships in weekly increments into a real environment, behind flags, with tests that describe intent rather than implementation.',
    tags: ['0→1 products', 'Rebuilds', 'APIs', 'Web apps'],
    signals: [
      'You have a validated problem and no engineering team to build against it.',
      'The prototype that got you here cannot survive the next ten thousand users.',
      'Delivery has slowed to the point where nobody can predict a release date.',
      'You need something in front of customers before a board meeting that is already scheduled.',
    ],
    deliverables: [
      'Production application and services',
      'Typed API contracts and client libraries',
      'Test suite and CI pipeline',
      'Instrumentation, dashboards and alerting',
      'Architecture decision records',
      'Handover pairing and runbooks',
    ],
    engagement: {
      shape: 'Build sprint or studio partnership',
      duration: '6–16 weeks',
      team: 'Two senior engineers, embedded with your team',
    },
    stack: ['TypeScript', 'React', 'Next.js', 'Node', 'Go', 'PostgreSQL', 'Terraform'],
    related: ['pulse', 'ferry'],
  },
  {
    id: 'creative',
    index: '02',
    title: 'Creative Engineering',
    summary: 'Interfaces that argue for the company behind them.',
    body: 'The category where design ambition usually dies in implementation. We build the interactive work — WebGL, choreographed motion, generative identity systems, configurators, editorial platforms — as engineered systems rather than one-off showpieces. Sixty frames on mid-range hardware, keyboard accessible, and structured so your team can add the next page without calling us.',
    tags: ['WebGL', 'Motion systems', 'Design systems', 'Brand platforms'],
    signals: [
      'Your brand promises a level of craft your website does not deliver.',
      'A design team keeps producing work engineering says is impossible.',
      'You are launching something that needs to be looked at, not just used.',
      'Your design system has drifted into forty variants of the same button.',
    ],
    deliverables: [
      'Production front-end and motion system',
      'Component library with documented tokens',
      'Shader and animation source with performance budgets',
      'Accessibility and reduced-motion pathways',
      'Content model and editing workflow',
    ],
    engagement: {
      shape: 'Build sprint',
      duration: '4–12 weeks',
      team: 'One senior creative engineer plus design partner',
    },
    stack: ['Three.js', 'GLSL', 'GSAP', 'React', 'TypeScript', 'Canvas', 'SVG'],
    related: ['halo', 'lumen'],
  },
  {
    id: 'ai',
    index: '03',
    title: 'AI Systems',
    summary: 'The unglamorous half that decides whether it works.',
    body: 'Anyone can wire a model to a text box. The engineering is in everything around it: what gets retrieved and why, how the system behaves when it does not know, what a wrong answer costs, and how you prove any of it improved after a change. We build the retrieval, the tool orchestration, the evaluation harness and the guardrails — and we tell you plainly when the answer is a database query instead.',
    tags: ['RAG', 'Agents', 'Evaluation', 'Guardrails'],
    signals: [
      'A demo impressed the board and nobody can make it reliable enough to launch.',
      'You have a decade of documents nobody can find anything in.',
      'Your team needs to know whether last week’s prompt change made things worse.',
      'You operate under rules where a confident wrong answer is a reportable event.',
    ],
    deliverables: [
      'Retrieval and ingestion pipeline',
      'Evaluation harness with regression suite',
      'Guardrail, citation and refusal design',
      'Cost and latency instrumentation per request',
      'Model-swap abstraction and benchmark report',
      'Human review and escalation workflow',
    ],
    engagement: {
      shape: 'Diagnostic first, then build sprint',
      duration: '8–16 weeks',
      team: 'Two senior engineers with domain-expert access',
    },
    stack: ['Python', 'TypeScript', 'pgvector', 'Claude', 'OpenTelemetry', 'Temporal'],
    related: ['atlas', 'pulse'],
  },
  {
    id: 'direction',
    index: '04',
    title: 'Technical Direction',
    summary: 'Senior judgement, without the permanent hire.',
    body: 'Sometimes the useful thing is not more code. We review the architecture, sit in the delivery process, read the codebase and tell you where the next twelve months of pain is coming from — with a sequenced plan and an honest estimate of what each item costs. Available as a fixed-fee diagnostic or a standing retainer alongside your leadership team.',
    tags: ['Audits', 'Architecture review', 'Fractional CTO', 'Hiring'],
    signals: [
      'You are about to spend seven figures and want a second opinion first.',
      'Due diligence is coming and you do not know what it will find.',
      'Your team is shipping slower each quarter and nobody can say precisely why.',
      'You are hiring your first senior engineers and have no one to assess them.',
    ],
    deliverables: [
      'Written architecture and delivery assessment',
      'Prioritised risk register with cost estimates',
      'Twelve-month technical roadmap',
      'Hiring scorecards and interview support',
      'Quarterly review cadence (retained engagements)',
    ],
    engagement: {
      shape: 'Diagnostic or retainer',
      duration: '1–2 weeks, or ongoing',
      team: 'Principal engineer',
    },
    stack: ['Architecture review', 'Delivery metrics', 'Cost modelling', 'Threat modelling'],
    related: ['ferry', 'atlas'],
  },
];

export function getService(id: string): Service | undefined {
  return services.find((service) => service.id === id);
}
