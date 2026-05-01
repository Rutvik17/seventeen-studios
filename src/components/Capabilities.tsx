/**
 * Capabilities section — the full-stack matrix: 4-col grid of 8 items.
 * Each tile is a title + short description; hover lightens the background
 * (see `.cap-item:hover` in the stylesheet).
 */

import { RevealUp, RevealStagger, RevealWords, SectionLabel } from './Reveal';

const CAPABILITIES: Array<{ title: string; body: string }> = [
  {
    title: 'LLM Integration & Fine-tuning',
    body: 'GPT-4, Claude, Llama, Mistral. Custom datasets, RLHF pipelines, domain-specific models.',
  },
  {
    title: 'WebGL & Shader Programming',
    body: 'Three.js, GLSL, custom render pipelines, real-time 3D for web and native.',
  },
  {
    title: 'Distributed Systems',
    body: 'Kafka, Kubernetes, microservices. Designed for 99.99% uptime and billion-event scale.',
  },
  {
    title: 'Generative AI Products',
    body: 'Image, video, audio generation. Stable Diffusion fine-tuning, ControlNet, production ComfyUI pipelines.',
  },
  {
    title: 'Interactive Installations',
    body: 'Physical-digital experiences. TouchDesigner, sensor integration, projection mapping.',
  },
  {
    title: 'Mobile & Native Apps',
    body: 'React Native, Swift, Kotlin. Production apps built to scale from day one.',
  },
  {
    title: 'AI Agents & Orchestration',
    body: 'Multi-agent systems, tool-use, RAG pipelines, autonomous workflows at scale.',
  },
  {
    title: 'Motion & Animation',
    body: 'GSAP, Framer Motion, Lottie, CSS. Interactions that feel alive and purposeful.',
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="capabilities">
      <div className="capabilities-intro">
        <div>
          <RevealUp>
            <SectionLabel>Full Capabilities</SectionLabel>
          </RevealUp>
          <RevealWords as="h3" className="capabilities-headline">
            The full stack of what we do
          </RevealWords>
        </div>
        <RevealUp as="p" className="capabilities-desc">
          From infrastructure to interface, from model to product — we cover
          every layer of the modern digital stack.
        </RevealUp>
      </div>
      {/*
        Stagger the inner content rather than the cells. The cells
        themselves stay at opacity:1 so their bg covers the grid
        container's --border background — otherwise scrolling in
        flashes a solid bar of border-color before the cards arrive.
      */}
      <RevealStagger
        as="div"
        className="capabilities-grid"
        staggerTarget=".cap-title, .cap-body"
      >
        {CAPABILITIES.map((cap) => (
          <div key={cap.title} className="cap-item">
            <div className="cap-title">{cap.title}</div>
            <p className="cap-body">{cap.body}</p>
          </div>
        ))}
      </RevealStagger>
    </section>
  );
}
