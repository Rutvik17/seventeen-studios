import type { Block, Capability, ProcessStep } from './types';

/** Global site facts. Single source of truth for metadata and the footer. */
export const site = {
  name: 'Seventeen Studios',
  wordmark: 'SEVENTEEN',
  tagline: 'An engineering studio for work that has to be right.',
  description:
    'Seventeen Studios is an independent engineering studio building software, interfaces and AI systems for teams whose ambition has outgrown their tooling.',
  founded: '2026',
  location: 'Toronto, Canada',
  timezone: 'America/Toronto',
  timezoneLabel: 'ET',
  email: 'hello@seventeenstudios.co',
  availability: 'Taking two engagements for Q4 2026',
  social: [
    { label: 'GitHub', href: 'https://github.com/rutvik17' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/' },
    { label: 'Email', href: 'mailto:hello@seventeenstudios.co' },
  ],
} as const;

export const nav = [
  { label: 'Studio', href: '/studio/' },
  { label: 'Work', href: '/work/' },
  { label: 'Thinking', href: '/thinking/' },
  { label: 'Contact', href: '/start/' },
] as const;

/** Marquee strip items. */
export const marqueeItems = [
  'Product Engineering',
  'Creative Engineering',
  'AI Systems',
  'Platform Modernisation',
  'Design Systems',
  'Realtime Data',
  'Technical Direction',
  'Interface Craft',
] as const;

/** The manifesto statement — split into an accented lead and body. */
export const manifesto = {
  label: 'Who we are',
  lead: 'We are a small studio that takes on the engineering other people call *impossible, expensive, or both* — and then makes it boring, on purpose.',
  body: [
    'Seventeen Studios started from a simple observation: most software fails long before it ships. It fails in the gap between what a team can describe and what a team can build. Agencies fill that gap with headcount. Consultancies fill it with process. We fill it with senior engineers who write the code, own the architecture, and stay accountable to the outcome.',
    'We are new. We are deliberate about saying so. What follows on this site is not a portfolio of past clients — it is the studio thinking out loud: concept briefs we designed end to end, essays on how we work, and the standard we hold ourselves to before anyone has paid us to hold it.',
  ],
} as const;

/** Numbered principles used on the studio page. */
export const principles: { index: string; title: string; body: string }[] = [
  {
    index: '01',
    title: 'Senior hands on the keyboard',
    body: 'The people you meet in the first call are the people who write the code. No pyramid, no handoff to a delivery team you have never spoken to. If we cannot staff it with people we would hire twice, we decline it.',
  },
  {
    index: '02',
    title: 'Ship in weeks, not quarters',
    body: 'Every engagement puts something real into a real environment inside three weeks — a running service, a working interface, a measured benchmark. Slides are a byproduct, never a deliverable.',
  },
  {
    index: '03',
    title: 'Architecture is a budget',
    body: 'Every abstraction spends something: build time, cognitive load, hiring surface. We spend deliberately and write down what each decision cost, so the next team can audit our reasoning instead of guessing at it.',
  },
  {
    index: '04',
    title: 'Motion carries meaning',
    body: 'Interface animation is not decoration. It is how software explains cause and effect — where a thing came from, what it belongs to, what just changed. We treat it with the same rigour as data modelling.',
  },
  {
    index: '05',
    title: 'Leave the codebase teachable',
    body: 'We measure success by how quickly your team stops needing us. Documented decisions, tests that describe intent, and a handover session that ends with your engineers making the next change unassisted.',
  },
  {
    index: '06',
    title: 'Say the uncomfortable thing early',
    body: 'If the plan is wrong, the deadline is fiction, or the feature should not exist, you hear it in week one — when it is still cheap. We would rather lose the scope than deliver something we would not defend.',
  },
];

export const capabilities: Capability[] = [
  {
    title: 'Systems Architecture',
    description:
      'Event-driven and service topologies, data contracts, failure domains, and the migration path from what you have to what you need.',
  },
  {
    title: 'Applied AI',
    description:
      'Retrieval pipelines, tool-using agents, evaluation harnesses, and the guardrail design that decides whether any of it is shippable.',
  },
  {
    title: 'Interface Engineering',
    description:
      'React and TypeScript at production scale — accessible, fast, and built as a component system your designers can actually drive.',
  },
  {
    title: 'Realtime & Streaming',
    description:
      'WebSocket and event-stream architectures, backpressure strategy, and interfaces that stay honest when the data is a second old.',
  },
  {
    title: 'WebGL & Motion',
    description:
      'GPU-accelerated interfaces, shader work, and choreography systems that hold sixty frames on the hardware your users actually own.',
  },
  {
    title: 'Developer Experience',
    description:
      'Build pipelines, preview environments, typed API clients, and the boring infrastructure that quietly doubles a team’s output.',
  },
  {
    title: 'Data Platform',
    description:
      'Warehouse modelling, lineage, and the semantic layer that stops three dashboards from disagreeing about the same number.',
  },
  {
    title: 'Performance',
    description:
      'Budgets set before the first commit, traced hot paths, and the unglamorous profiling work that turns a 4-second load into 800ms.',
  },
];

export const process: ProcessStep[] = [
  {
    index: '01',
    title: 'Interrogate',
    duration: 'Week 1',
    description:
      'We spend the first week trying to disprove the brief. What is actually broken, who feels it, what has already been attempted, and what would have to be true for this to be worth building? You get our honest read even when it shrinks the engagement.',
    outputs: ['Problem statement', 'Constraint map', 'Kill criteria', 'Revised scope'],
  },
  {
    index: '02',
    title: 'Prove',
    duration: 'Weeks 2–3',
    description:
      'The riskiest assumption gets built first, not last. A working spike in your environment against your data — the thing most likely to sink the project, resolved while the cost of being wrong is still a fortnight.',
    outputs: ['Technical spike', 'Benchmark results', 'Architecture decision records'],
  },
  {
    index: '03',
    title: 'Build',
    duration: 'Weeks 4–12',
    description:
      'Weekly increments into a real environment behind flags. You see progress in the product, not in a status document. Scope moves; the ship date does not.',
    outputs: ['Production increments', 'Test suite', 'Instrumentation', 'Weekly demo'],
  },
  {
    index: '04',
    title: 'Hand over',
    duration: 'Final 2 weeks',
    description:
      'We work ourselves out of the job on purpose. Your engineers drive the last two increments while we review. The engagement ends when your team ships a change we never touched.',
    outputs: ['Runbooks', 'Decision log', 'Pairing sessions', 'Thirty-day support window'],
  },
];

export const engagements: {
  name: string;
  price: string;
  duration: string;
  summary: string;
  includes: string[];
  best: string;
}[] = [
  {
    name: 'Diagnostic',
    price: 'Fixed fee',
    duration: '1–2 weeks',
    summary:
      'A senior read on an existing system: architecture, delivery bottlenecks, risk. Ends with a written assessment and a sequenced plan you own, whether or not we build it.',
    includes: [
      'Codebase and infrastructure review',
      'Team and delivery interviews',
      'Written assessment with prioritised findings',
      'Twelve-month sequencing plan',
    ],
    best: 'You inherited something and need to know how bad it is.',
  },
  {
    name: 'Build sprint',
    price: 'Monthly',
    duration: '6–12 weeks',
    summary:
      'A dedicated senior pair shipping a defined outcome — a product surface, a migration, an AI capability — into production behind flags, with your team embedded alongside.',
    includes: [
      'Two senior engineers, full-time',
      'Weekly production increments',
      'Architecture decision records',
      'Instrumentation and runbooks',
      'Handover pairing at the end',
    ],
    best: 'You know what to build and need it built properly, quickly.',
  },
  {
    name: 'Studio partner',
    price: 'Retained',
    duration: '6+ months',
    summary:
      'Continuous technical direction and delivery capacity. We hold the architecture, review the hires, and stay on the hook for the roadmap alongside your leadership.',
    includes: [
      'Standing engineering capacity',
      'Technical direction and hiring support',
      'Quarterly architecture review',
      'Priority scheduling',
    ],
    best: 'You are scaling and do not yet have the senior bench for it.',
  },
];

export const faq: { question: string; answer: string }[] = [
  {
    question: 'You have no client work. Why would we hire you?',
    answer:
      'Because you can audit our thinking before you spend anything. Every concept brief on this site is a complete engagement plan — architecture, sequencing, risks, the numbers we would be measured against. Read one, then judge whether we would be useful. The studio is new; the engineering is not.',
  },
  {
    question: 'How do you price work?',
    answer:
      'Fixed fee for diagnostics, monthly for build sprints, retained for partnerships. No hourly billing — it rewards slowness and punishes the shortcuts that come from experience. Scope is negotiable throughout; the price is not renegotiated mid-engagement.',
  },
  {
    question: 'Who actually does the work?',
    answer:
      'Senior engineers only, with a hard cap of five people on the studio bench. Larger scope means a longer timeline or a smaller scope — never a junior team wearing our name.',
  },
  {
    question: 'Do you work with existing engineering teams?',
    answer:
      'Preferably. The best outcomes come from embedding: your engineers in our reviews, ours in your standups. We are not trying to build a dependency, we are trying to leave a capability behind.',
  },
  {
    question: 'What do you not do?',
    answer:
      'Staff augmentation by the seat, work we cannot see the outcome of, projects where the deadline is already impossible on day one, and anything requiring us to pretend a plan is fine when it is not.',
  },
  {
    question: 'What stack do you work in?',
    answer:
      'TypeScript, React and Next.js on the front; Node, Python and Go on the back; Postgres by default; Terraform for infrastructure; whatever cloud you are already in. For AI work: the current frontier model families with an evaluation harness that lets you swap them out when the pricing changes.',
  },
];

/** The long-form studio narrative on /studio. */
export const studioStory: Block[] = [
  {
    type: 'p',
    text: 'Seventeen Studios is an engineering studio in its first year. It exists because of a pattern that shows up in almost every company that has ever hired outside help to build software: the work arrives technically complete and practically useless. The API is there. The screens are there. Nobody on the team can extend any of it, nobody wrote down why it is shaped that way, and the first real change costs more than the original build.',
  },
  {
    type: 'p',
    text: 'That failure is not a talent problem. It is a structural one. The agency model makes money on leverage — sell senior, deliver junior — and the consultancy model makes money on duration. Both are rational businesses. Neither is optimised for the thing you actually want, which is a system your own team can carry.',
  },
  { type: 'h2', text: 'The bet' },
  {
    type: 'p',
    text: 'So the studio is built the other way around. Small, capped, senior-only, priced by outcome rather than hour. We take fewer engagements than we could sell. We publish our reasoning before anyone commissions it. And we treat the handover — the part most vendors quietly skip — as the deliverable that everything else serves.',
  },
  {
    type: 'p',
    text: 'The bet is that a studio which is *harder to scale* is easier to trust, and that trust compounds faster than headcount. We would rather be the shop three companies call first than the shop thirty companies call once.',
  },
  { type: 'h2', text: 'Working in the open' },
  {
    type: 'p',
    text: 'Until there is client work to show, this site shows the next best thing: complete, self-initiated concept briefs. Each one takes a real problem in a real industry and works it end to end — the research we would run, the architecture we would choose, the decisions we would regret, the numbers we would be judged on, and the risks that could sink it.',
  },
  {
    type: 'note',
    label: 'On honesty',
    text: 'Nothing on this site is a case study of delivered client work, and nothing is dressed up to look like one. The concept briefs are labelled as concepts. Every number in them is a projection with its measurement method attached. When that changes, this paragraph changes with it.',
  },
  { type: 'h2', text: 'Where the name comes from' },
  {
    type: 'p',
    text: 'Seventeen is the number of a system that refuses to factor cleanly — prime, awkward, the first number people reach for when asked to pick one at random and the one they are least able to explain. It is a reasonable description of most interesting engineering problems, and a better description of the work we want than any word ending in “-ly”.',
  },
];
