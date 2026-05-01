/**
 * Services section — 3-column grid of the three disciplines.
 *
 * Each card is driven by `<ServiceCard>`; content lives in this file so
 * it's easy to hand off to an editor without touching component logic.
 */

import { ServiceCard, type ServiceCardProps } from './ServiceCard';
import { RevealUp, RevealStagger, RevealWords, SectionLabel } from './Reveal';

const SERVICES: ServiceCardProps[] = [
  {
    number: '01',
    title: 'Software Engineering',
    body: 'Scalable, production-grade systems built with rigour. From distributed backends to performant frontends, we architect for the long term.',
    tags: ['Architecture', 'Fullstack', 'Cloud', 'DevOps', 'APIs'],
    modalId: 'svc-software',
  },
  {
    number: '02',
    title: 'Creative Engineering',
    body: 'We blur the line between code and craft. WebGL, generative art, real-time 3D, and interactive installations — technology as a medium for expression.',
    tags: ['WebGL', 'Three.js', 'GSAP', 'Shaders', 'XR'],
    modalId: 'svc-creative',
  },
  {
    number: '03',
    title: 'AI Engineering',
    body: 'Custom LLM integrations, fine-tuning pipelines, multimodal systems, and AI-native product experiences that are genuinely intelligent.',
    tags: ['LLMs', 'Fine-tuning', 'RAG', 'Agents', 'MLOps'],
    modalId: 'svc-ai',
  },
];

export function Services() {
  return (
    <section id="services" className="services">
      <div className="services-header">
        <div>
          <RevealUp>
            <SectionLabel>Our Disciplines</SectionLabel>
          </RevealUp>
          <RevealWords as="h2" className="services-title">
            What we build for you
          </RevealWords>
        </div>
        <RevealUp as="p" className="services-desc">
          Three integrated practices. One team. Outcomes that live at the
          edge of what is technically possible.
        </RevealUp>
      </div>
      <RevealStagger as="div" className="services-grid">
        {SERVICES.map((svc) => (
          <ServiceCard key={svc.modalId} {...svc} />
        ))}
      </RevealStagger>
    </section>
  );
}
