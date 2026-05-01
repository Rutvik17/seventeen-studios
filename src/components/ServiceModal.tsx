/**
 * Service-detail modals (3 total).
 *
 * Content is table-driven — edit `SERVICE_MODALS` to update copy without
 * touching markup. All three modals are rendered simultaneously; the host
 * `<Modal>` component keeps them invisible until their id matches the
 * active modal in the store.
 */

import {
  Modal,
  ModalMetrics,
  ModalSection,
  ModalStack,
} from './Modal';
import type { ModalId } from '@/lib/modal-store';

interface ServiceModalContent {
  id: Extract<ModalId, 'svc-software' | 'svc-creative' | 'svc-ai'>;
  tag: string;
  title: string;
  overview: string;
  metrics: Array<{ value: string; label: string }>;
  deliver: string;
  how: string;
  tech: string[];
}

const SERVICE_MODALS: ServiceModalContent[] = [
  {
    id: 'svc-software',
    tag: 'Service — 01',
    title: 'Software Engineering',
    overview:
      'We design and build software systems that are meant to last. Every engagement starts with understanding your business constraints, then working backwards to the right architecture — not the most fashionable one.',
    metrics: [
      { value: '99.99%', label: 'Uptime SLA target' },
      { value: '2 wks', label: 'Sprint cadence' },
      { value: 'Senior', label: 'Engineers only' },
    ],
    deliver:
      'Distributed backend systems, event-driven architectures, GraphQL and REST APIs, real-time data pipelines, cloud-native infrastructure on AWS, GCP or Azure, CI/CD pipelines, and full observability stacks. We embed into your team or lead the full build.',
    how: 'Two-week sprints. A working demo at the end of every sprint. Architecture decisions documented and explained. No black-box engineering. You always know exactly what is being built and why.',
    tech: [
      'TypeScript',
      'Go',
      'Rust',
      'Python',
      'Kubernetes',
      'Kafka',
      'PostgreSQL',
      'Redis',
      'Terraform',
      'AWS',
      'GCP',
      'Datadog',
    ],
  },
  {
    id: 'svc-creative',
    tag: 'Service — 02',
    title: 'Creative Engineering',
    overview:
      'We build experiences that stop people in their tracks. Combining deep graphics programming knowledge with a strong aesthetic sensibility, we create digital worlds that feel genuinely alive — in the browser, in the gallery, or on the event stage.',
    metrics: [
      { value: '60fps', label: 'Target render performance' },
      { value: 'WebGL', label: 'Core rendering layer' },
      { value: 'Any', label: 'Scale — web to installation' },
    ],
    deliver:
      'WebGL experiences, custom GLSL shaders, real-time 3D product configurators, immersive scroll-driven storytelling, generative art installations, extended reality (XR) prototypes, and motion-design systems integrated into production codebases.',
    how: 'Creative engineering starts with a concept sprint — two to three days of rapid prototyping to establish the visual and technical direction. From there we build iteratively, with performance budgets defined from day one so the final piece is as fast as it is beautiful.',
    tech: [
      'Three.js',
      'GLSL',
      'WebGPU',
      'GSAP',
      'Lenis',
      'React',
      'Next.js',
      'TouchDesigner',
      'Blender',
    ],
  },
  {
    id: 'svc-ai',
    tag: 'Service — 03',
    title: 'AI Engineering',
    overview:
      'We build AI systems that actually work in production — not demos, not prototypes that collapse under real traffic. From custom model fine-tuning to multi-agent orchestration, we design AI infrastructure for reliability, cost-efficiency, and genuine business impact.',
    metrics: [
      { value: 'Prod', label: 'Ready from day one' },
      { value: 'Eval', label: 'Driven development' },
      { value: 'Full', label: 'Stack AI delivery' },
    ],
    deliver:
      'Custom LLM integrations, domain-specific fine-tuning, retrieval-augmented generation (RAG) pipelines, multi-agent systems with tool-use, multimodal AI features (vision, audio, video), and the MLOps infrastructure to monitor and improve models continuously in production.',
    how: 'We start with an AI audit — understanding your data, your user needs, and the performance bar required. We prototype and evaluate before committing to a full build. Every model decision is explainable, and every system ships with evals so you know it is working.',
    tech: [
      'OpenAI',
      'Anthropic',
      'Llama 3',
      'LangChain',
      'LlamaIndex',
      'Pinecone',
      'Hugging Face',
      'MLflow',
      'Modal',
    ],
  },
];

export function ServiceModals() {
  return (
    <>
      {SERVICE_MODALS.map((m) => (
        <Modal key={m.id} id={m.id} tag={m.tag} title={m.title}>
          <ModalSection label="Overview">
            <p>{m.overview}</p>
          </ModalSection>
          <ModalMetrics items={m.metrics} />
          <ModalSection label="What we deliver">
            <p>{m.deliver}</p>
          </ModalSection>
          <ModalSection label="How we work">
            <p>{m.how}</p>
          </ModalSection>
          <ModalSection label="Technology">
            <ModalStack tags={m.tech} />
          </ModalSection>
        </Modal>
      ))}
    </>
  );
}
