/**
 * Concept case-study modals (5 total).
 *
 * Same pattern as ServiceModals: content is data-driven and the shared
 * `<Modal>` component only renders the currently active id.
 */

import {
  Modal,
  ModalHeroImage,
  ModalMetrics,
  ModalSection,
  ModalStack,
} from './Modal';
import type { ModalId } from '@/lib/modal-store';

interface CaseStudyContent {
  id: Extract<ModalId, 'cs-pulse' | 'cs-forma' | 'cs-layer' | 'cs-echo' | 'cs-ark'>;
  tag: string;
  title: string;
  placeholder: string;
  brief: string;
  approach: string;
  metrics: Array<{ value: string; label: string }>;
  tech: string[];
}

const CASE_STUDIES: CaseStudyContent[] = [
  {
    id: 'cs-pulse',
    tag: 'Concept Brief · AI Engineering',
    title: 'Pulse — Real-time Market Intelligence',
    placeholder:
      'Concept visual — Pulse AI platform\nreal-time signal processing dashboard',
    brief:
      'A hypothetical fintech client: a hedge fund analyst team spending 60% of their day aggregating news, filings, and social signals manually across dozens of sources. The ask — compress that to a single intelligent interface that surfaces only what matters, ranked by relevance to their specific portfolio thesis.',
    approach:
      'Pulse would be built on a streaming ingestion layer consuming 200+ data sources in real time — news wires, SEC filings, earnings calls, social feeds. A fine-tuned LLM layer would classify and score each signal against configurable portfolio theses. A multi-agent reasoning system would synthesise signals into analyst-grade summaries with source citations. The interface: a minimal, keyboard-driven dashboard where nothing is shown that has not already been scored as relevant.',
    metrics: [
      { value: '200+', label: 'Ingested data sources' },
      { value: '<2s', label: 'Signal-to-surface latency' },
      { value: '60%', label: 'Analyst time recovered' },
    ],
    tech: [
      'Kafka',
      'Flink',
      'Pinecone',
      'Claude 3.5',
      'LangGraph',
      'Next.js',
      'Go',
      'PostgreSQL',
      'D3.js',
    ],
  },
  {
    id: 'cs-forma',
    tag: 'Concept Brief · Creative Engineering',
    title: 'Forma — Generative Brand Experience',
    placeholder:
      'Concept visual — Forma WebGL environment\ncloth simulation and generative material system',
    brief:
      'A luxury fashion brand launching a digital-first collection. Their constraint: the online experience must match the tactile, sensory quality of a physical runway show. Standard e-commerce product photography is explicitly off the table. The deliverable is an experience, not a storefront.',
    approach:
      'Forma would be a full-browser WebGL environment where each garment exists as a real-time cloth simulation — Verlet integration running in GLSL compute shaders. Visitors navigate a custom 3D space with a cinematic camera controller we build from scratch. Fabric physics respond to mouse movement and spatial audio. The entire experience is headless-CMS driven so the brand team can update the collection without engineering support. Load target: under 2 seconds on a standard connection.',
    metrics: [
      { value: '60fps', label: 'On mid-range hardware' },
      { value: '<2s', label: 'Initial load target' },
      { value: 'Zero', label: 'Game engine dependency' },
    ],
    tech: [
      'Three.js',
      'GLSL',
      'WebGL 2',
      'GSAP',
      'Lenis',
      'Next.js',
      'Sanity CMS',
      'Tone.js',
      'Vercel',
    ],
  },
  {
    id: 'cs-layer',
    tag: 'Concept Brief · Software Engineering',
    title: 'Layer — Event Streaming Infrastructure',
    placeholder:
      'Concept visual — Layer infrastructure topology\ndistributed event streaming architecture',
    brief:
      'A fast-scaling B2B SaaS company: 18 months from Series A to processing 500 million events per day, with a monolithic PostgreSQL setup that was never designed for this load. P99 latency at 3+ seconds, an engineering team afraid to deploy on Fridays, and a CEO who had just seen a competitor go viral for a real-time feature they could not build.',
    approach:
      'Layer is the architecture we would design: a strangler-fig migration to an event-driven system using Kafka at the core. Over 12 weeks we would incrementally move read and write paths — Kafka for streaming, ClickHouse for analytics, Redis for sub-millisecond caching, a new API gateway gradually shifting traffic from the monolith. Zero-downtime migration as a hard constraint. At the end, the team can build the real-time feature. And deploy on Fridays.',
    metrics: [
      { value: '500M+', label: 'Daily events' },
      { value: '<20ms', label: 'P99 latency target' },
      { value: '0', label: 'Downtime tolerance' },
    ],
    tech: [
      'Kafka',
      'ClickHouse',
      'Redis Cluster',
      'Kubernetes',
      'Go',
      'GraphQL',
      'Terraform',
      'Datadog',
      'AWS',
    ],
  },
  {
    id: 'cs-echo',
    tag: 'Concept Brief · AI · Creative',
    title: 'Echo — AI Audio Intelligence Platform',
    placeholder:
      'Concept visual — Echo audio platform\nwaveform analysis and AI composition interface',
    brief:
      'A music technology company wants to give independent artists the production capabilities of a major label studio — without the budget. The core problem: most AI music tools produce generic output. Artists want a collaborator that understands their specific sound, not a prompt-to-audio generator that sounds like everyone else.',
    approach:
      'Echo would be built on a personalisation-first architecture. An artist uploads their catalogue; Echo builds a latent-space model of their sonic identity — harmonic patterns, rhythmic tendencies, timbral fingerprints. From there, AI suggestions are always filtered through that identity model before being surfaced. The interface is a DAW-adjacent canvas, not a chat box. Real-time waveform visualisation is built on WebGL for performance, with GSAP-driven micro-interactions that make the tool feel as expressive as the music it produces.',
    metrics: [
      { value: 'Artist', label: 'Identity-aware AI' },
      { value: 'WebGL', label: 'Real-time waveform render' },
      { value: 'Zero', label: 'Generic output tolerance' },
    ],
    tech: [
      'AudioCraft',
      'Stable Audio',
      'Hugging Face',
      'Three.js',
      'GSAP',
      'Web Audio API',
      'FastAPI',
      'PostgreSQL',
      'Modal',
    ],
  },
  {
    id: 'cs-ark',
    tag: 'Concept Brief · Product · Software',
    title: 'Ark — Personal Knowledge AI',
    placeholder:
      'Concept visual — Ark mobile interface\nknowledge graph and smart recall UI',
    brief:
      'A consumer productivity startup with a clear thesis: most note-taking apps help you store things, but none help you retrieve and connect them intelligently. They want to build the second brain that actually works — not a prettier Notion, but a genuinely intelligent memory system that surfaces what you need before you know you need it.',
    approach:
      'Ark would be built mobile-first, in React Native, with a continuous capture model — voice, text, links, images, documents all flow into a unified knowledge graph. A retrieval layer using pgvector surfaces semantically related memories as you work. The AI layer is proactive: before a meeting, Ark surfaces everything you know about the attendees and topics. After a conversation, it suggests what to capture. The UX borrows from messaging, not productivity software, keeping the interface frictionless enough for daily habit formation.',
    metrics: [
      { value: 'Always', label: 'On capture model' },
      { value: 'Proactive', label: 'AI surface triggers' },
      { value: 'iOS + Android', label: 'Native performance' },
    ],
    tech: [
      'React Native',
      'Expo',
      'GPT-4o',
      'pgvector',
      'Django',
      'PostgreSQL',
      'Redis',
      'Whisper',
      'Reanimated 3',
    ],
  },
];

export function CaseStudyModals() {
  return (
    <>
      {CASE_STUDIES.map((c) => (
        <Modal key={c.id} id={c.id} tag={c.tag} title={c.title}>
          <ModalHeroImage placeholder={c.placeholder} />
          <ModalSection label="The brief">
            <p>{c.brief}</p>
          </ModalSection>
          <ModalSection label="Our approach">
            <p>{c.approach}</p>
          </ModalSection>
          <ModalMetrics items={c.metrics} />
          <ModalSection label="Technology plan">
            <ModalStack tags={c.tech} />
          </ModalSection>
        </Modal>
      ))}
    </>
  );
}
