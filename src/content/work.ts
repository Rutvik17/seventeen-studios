import type { Concept } from './types';

/**
 * Concept briefs.
 *
 * These are self-initiated, speculative engagements — not delivered client
 * work, and labelled that way everywhere they appear. Each one is worked
 * through end to end so a prospective client can audit how the studio thinks
 * before commissioning anything: the research, the architecture, the
 * sequencing, the numbers we would accept being measured on, and the risks
 * that could sink it.
 */
export const concepts: Concept[] = [
  {
    slug: 'pulse',
    index: '001',
    name: 'Pulse',
    title: 'An operations console that explains itself',
    sector: 'Freight & logistics',
    discipline: 'Product Engineering · AI Systems',
    year: '2026',
    timeline: '14 weeks',
    seed: 1704,
    poster: 'flow',
    excerpt:
      'Mid-market freight operators drown in telemetry and starve for narrative. Pulse turns a firehose of events into the four sentences a dispatcher actually needs before 7am.',
    premise:
      'A dispatcher does not need another dashboard. They need to know which six of today’s four hundred shipments will go wrong, and what to do about each one, before the phone starts ringing.',
    sections: [
      {
        label: 'Context',
        heading: 'The problem nobody buys software for',
        blocks: [
          {
            type: 'p',
            text: 'A mid-market freight brokerage moving 3,000 loads a week already owns the data. Telematics from carriers, EDI status messages, weather feeds, dock appointment systems, a transport management system that has been customised for eleven years. Every one of those systems has a dashboard. Most have alerts. And every morning the operations floor still runs on a spreadsheet somebody rebuilds by hand, because none of the dashboards answer the only question that matters: *what is going to hurt today?*',
          },
          {
            type: 'p',
            text: 'The failure is not visualisation. It is that operational software is built around entities — shipments, carriers, lanes — while operational work is organised around exceptions. A dispatcher spends their day on the two percent of loads that deviate. Software that renders all one hundred percent equally has handed the filtering problem back to a human at exactly the moment they are least able to do it well.',
          },
          {
            type: 'p',
            text: 'The second failure is trust. Most predictive freight tools produce a risk score, and a score is unauditable. When a system says a load is 78% likely to miss its appointment and cannot say why, an experienced dispatcher — correctly — ignores it. Adoption dies not because the model is wrong but because the interface gave them no way to disagree with it.',
          },
        ],
      },
      {
        label: 'Approach',
        heading: 'What we would prove in the first three weeks',
        blocks: [
          {
            type: 'p',
            text: 'The riskiest assumption is not the model. It is that historical event data contains enough signal to beat a dispatcher’s intuition at a horizon long enough to act on. We would test that before writing a line of product code.',
          },
          {
            type: 'list',
            ordered: true,
            items: [
              'Backfill twelve months of shipment events and label every load that missed its delivery window, along with the earliest moment the miss became predictable from data alone.',
              'Build a deliberately boring baseline — gradient-boosted trees over lane, carrier, hour-of-day, dwell time, weather — and measure precision at the top of the ranked list, because that is the only part of the distribution a dispatcher will ever look at.',
              'Run a blind bake-off: three dispatchers rank a morning’s loads by risk; the model ranks the same set; both are scored against what actually happened.',
              'Only if the model wins, or wins at a longer horizon, does the engagement continue. If it loses, we say so and the brief becomes a workflow tool instead of a prediction one.',
            ],
          },
          {
            type: 'note',
            label: 'Kill criteria',
            text: 'Fewer than 3 of the top 10 flagged loads actually deviate, or the model’s useful horizon is under 90 minutes. Either result ends the AI scope and refunds the remainder — that clause goes in the statement of work.',
          },
        ],
      },
      {
        label: 'System',
        heading: 'Three surfaces, one event log',
        blocks: [
          {
            type: 'p',
            text: 'Every inbound signal lands in an append-only event log keyed by shipment. Everything downstream — the risk model, the console, the audit trail — is a projection of that log, which means any number on screen can be traced back to the exact events that produced it. This is the architectural decision the whole product rests on.',
          },
          {
            type: 'defs',
            items: [
              {
                term: 'The Brief',
                description:
                  'A generated morning summary — four to six sentences, written by a language model constrained to facts drawn from the event log, each claim carrying a link to the events behind it. Not a chatbot. A document that is finished when you open it.',
              },
              {
                term: 'The Board',
                description:
                  'A ranked exception queue. Each row states the predicted failure, the horizon, the three features driving the prediction, and the two actions available. Dismissing a row asks why — and that answer becomes training data.',
              },
              {
                term: 'The Trace',
                description:
                  'The audit surface. For any shipment: every event received, every prediction made, every action taken, and who took it. This is what makes the system arguable, and arguable is what makes it adopted.',
              },
            ],
          },
          {
            type: 'p',
            text: 'The language model never touches raw prediction. It writes prose over a structured findings object produced by deterministic code, which caps the failure mode at *awkward phrasing* rather than *invented shipment*. Every generated sentence is validated against the findings object before it renders; a sentence that references a fact not in the object is dropped rather than shown.',
          },
          {
            type: 'code',
            language: 'ts',
            code: `// The generation contract: prose is a view over facts, never a source of them.
type Finding = {
  shipmentId: string
  kind: 'dwell_exceeded' | 'eta_slip' | 'appointment_risk' | 'carrier_silent'
  horizonMinutes: number
  confidence: number
  evidence: EventRef[]      // pointers into the append-only log
  suggestedActions: Action[]
}

const brief = await compose(findings, {
  // Any sentence that cannot be mapped back to a Finding is discarded.
  validate: (sentence, findings) => groundsIn(sentence, findings),
  maxSentences: 6,
})`,
          },
        ],
      },
      {
        label: 'Sequencing',
        heading: 'Fourteen weeks, in public',
        blocks: [
          {
            type: 'defs',
            items: [
              {
                term: 'Weeks 1–3 · Prove',
                description:
                  'Event ingestion for the two highest-volume sources, historical backfill, baseline model, blind bake-off against dispatchers. Go/no-go on the prediction scope.',
              },
              {
                term: 'Weeks 4–7 · The Board',
                description:
                  'The exception queue in production for one desk, no generation, no automation. If the ranked list alone does not change how that desk works, nothing downstream will.',
              },
              {
                term: 'Weeks 8–11 · The Brief and The Trace',
                description:
                  'Grounded generation, evidence links, full audit surface. Rolled out desk by desk with a dismissal-reason loop feeding retraining.',
              },
              {
                term: 'Weeks 12–14 · Hand over',
                description:
                  'Your engineers own the last two increments. Runbooks, model retraining schedule, on-call rota, and a thirty-day support window.',
              },
            ],
          },
        ],
      },
      {
        label: 'Rationale',
        heading: 'What this brief demonstrates',
        blocks: [
          {
            type: 'p',
            text: 'Pulse is on this site because it is the shape of engagement we are built for: real operational stakes, a tempting AI answer that has to be earned rather than assumed, and a user population that will reject anything it cannot argue with. The interesting engineering is not the model — it is the event log, the grounding contract, and the decision to ship a ranked list before shipping a single generated word.',
          },
        ],
      },
    ],
    metrics: [
      {
        label: 'Exception precision',
        value: '≥ 6 / 10',
        method:
          'Of the top ten ranked loads each morning, at least six actually deviate. Measured daily against outcomes, reported weekly, published to the operations floor.',
      },
      {
        label: 'Useful horizon',
        value: '≥ 3 hrs',
        method:
          'Median lead time between a flag being raised and the deviation occurring. Anything under ninety minutes is unactionable and counted as a miss.',
      },
      {
        label: 'Morning prep',
        value: '−45 min',
        method:
          'Timed observation of the manual spreadsheet ritual before rollout versus after, across three dispatchers over two weeks each.',
      },
    ],
    stack: [
      { group: 'Ingestion', items: ['Kafka', 'Debezium', 'Go workers', 'EDI 214 parsers'] },
      { group: 'Data', items: ['PostgreSQL', 'TimescaleDB', 'dbt', 'Great Expectations'] },
      { group: 'Modelling', items: ['Python', 'XGBoost', 'MLflow', 'SHAP for feature attribution'] },
      { group: 'Generation', items: ['Claude', 'Structured findings contract', 'Grounding validator'] },
      { group: 'Interface', items: ['Next.js', 'TypeScript', 'TanStack Query', 'Server-sent events'] },
      { group: 'Operations', items: ['Terraform', 'OpenTelemetry', 'Grafana', 'PagerDuty'] },
    ],
    risks: [
      {
        risk: 'Carrier telemetry is sparser or later than the sales pitch implies.',
        mitigation:
          'Week one measures actual event latency per carrier before any modelling. Carriers below a freshness threshold are excluded from prediction and shown as “unknown” rather than being quietly guessed at.',
      },
      {
        risk: 'Dispatchers treat the system as surveillance and route around it.',
        mitigation:
          'No individual performance metrics are collected, and that is stated in the rollout. The dismissal loop is framed as teaching the system, and dispatchers see their own corrections improve the ranking within a week.',
      },
      {
        risk: 'Generated prose becomes the thing people trust instead of the evidence.',
        mitigation:
          'Every sentence carries an evidence link, and the Brief is deliberately shipped last — after the desk already trusts the ranked list on its own merits.',
      },
    ],
  },

  {
    slug: 'atlas',
    index: '002',
    name: 'Atlas',
    title: 'Retrieval for knowledge that carries consequences',
    sector: 'Regulated manufacturing',
    discipline: 'AI Systems · Technical Direction',
    year: '2026',
    timeline: '16 weeks',
    seed: 2718,
    poster: 'strata',
    excerpt:
      'Forty years of validated procedures, deviation reports and change controls. A search system where a confident wrong answer is a regulatory event, not a bad UX day.',
    premise:
      'In regulated environments the hard problem is not finding the answer. It is proving which document the answer came from, which version was in force at the time, and knowing when to refuse.',
    sections: [
      {
        label: 'Context',
        heading: 'Where naïve retrieval fails badly',
        blocks: [
          {
            type: 'p',
            text: 'A manufacturer under GMP obligations holds four decades of standard operating procedures, batch records, deviation investigations, CAPA files and change controls. Roughly 900,000 documents, most as scanned PDFs, many superseded, all of them version-controlled by a quality system that nobody wants to touch. A process engineer investigating a deviation spends hours establishing not what the procedure says, but what it said on the day the batch ran.',
          },
          {
            type: 'p',
            text: 'Standard retrieval-augmented generation fails here in a specific and dangerous way. Chunk the corpus, embed it, retrieve the top matches, and the system will confidently cite a procedure that was withdrawn in 2019 — because semantically it is the best match. The answer reads perfectly. It is also the kind of error that turns into a finding at the next inspection.',
          },
          {
            type: 'p',
            text: 'The second trap is that these users do not want prose. A quality engineer asking about a cleaning validation limit wants the clause, the document number, the effective revision, and the approval signature — not a paragraph that summarises them. Generation is a small part of this product, and pretending otherwise is how these projects die in validation.',
          },
        ],
      },
      {
        label: 'Approach',
        heading: 'Time is a first-class dimension',
        blocks: [
          {
            type: 'p',
            text: 'Every chunk in the index carries an effectivity interval — the window during which that revision was the governing one — plus its document lineage, approval state and site applicability. Retrieval is always filtered by an *as-of* date before relevance is ever considered. The default as-of is today; a deviation investigation sets it to the batch date, and every result on screen changes accordingly.',
          },
          {
            type: 'list',
            ordered: true,
            items: [
              'Ingest with layout-aware parsing and OCR confidence retained per span, so a low-confidence scan can never be silently promoted into a citation.',
              'Chunk along document structure — clause, table, appendix — never at a fixed token count, because a cleaning limit split across a chunk boundary is a wrong answer waiting to happen.',
              'Hybrid retrieval: BM25 for document numbers and exact clause identifiers, dense vectors for conceptual queries, reciprocal rank fusion to combine them, then a cross-encoder rerank over the top fifty.',
              'Answer synthesis restricted to extractive quotation plus a short connective summary. Every claim renders with its document number, revision, effective date and page anchor.',
            ],
          },
          {
            type: 'note',
            label: 'The refusal path',
            text: 'When retrieval confidence falls below threshold, or the retrieved set spans conflicting revisions, the system says so and routes to a named human owner. Refusal is a designed feature with its own UI, its own metrics and its own service level — not an error state.',
          },
        ],
      },
      {
        label: 'System',
        heading: 'The evaluation harness is the deliverable',
        blocks: [
          {
            type: 'p',
            text: 'The part of this engagement that outlives us is not the retrieval pipeline. It is the harness that proves the pipeline still works after every change — model version, prompt, chunking strategy, index rebuild. Without it, the system degrades invisibly and nobody notices until an auditor does.',
          },
          {
            type: 'defs',
            items: [
              {
                term: 'Golden set',
                description:
                  '400 questions written by quality engineers, each with a verified answer span, the governing document revision, and an as-of date. Built in week two, before any model work, and treated as a controlled document.',
              },
              {
                term: 'Adversarial set',
                description:
                  '120 questions engineered to induce failure: superseded procedures, near-identical site variants, questions with no valid answer, and questions whose answer changed between revisions. Scored primarily on correct refusal.',
              },
              {
                term: 'Regression gate',
                description:
                  'No configuration reaches production without clearing both sets. Results are versioned alongside the index and exportable as validation evidence.',
              },
            ],
          },
          {
            type: 'code',
            language: 'py',
            code: `# Retrieval is filtered by effectivity before relevance is considered.
def retrieve(question: str, as_of: date, site: str) -> list[Chunk]:
    candidates = index.filter(
        effective_from__lte=as_of,
        effective_to__gt=as_of,        # supersession is a hard filter
        site__in=[site, "GLOBAL"],
        approval_state="APPROVED",
    )
    lexical = bm25(question, candidates, k=50)
    dense   = vectors(question, candidates, k=50)
    fused   = reciprocal_rank_fusion(lexical, dense)
    return cross_encoder.rerank(question, fused)[:8]`,
          },
          {
            type: 'p',
            text: 'Access control is enforced at the index layer rather than the answer layer. A user who cannot open a document cannot retrieve a chunk from it, cannot see it cited, and cannot infer its contents from a summary — the common shortcut of filtering citations after generation leaks exactly the information the permission model exists to protect.',
          },
        ],
      },
      {
        label: 'Sequencing',
        heading: 'Sixteen weeks, validation-shaped',
        blocks: [
          {
            type: 'defs',
            items: [
              {
                term: 'Weeks 1–4 · Corpus truth',
                description:
                  'Ingestion, OCR quality assessment, effectivity modelling, golden set authored with quality engineers. Deliverable: a report on how much of the corpus is actually machine-readable, which is usually the uncomfortable finding.',
              },
              {
                term: 'Weeks 5–9 · Retrieval without generation',
                description:
                  'Search that returns clauses with full provenance. Shipped to twelve users. Measured on answer-found rate and time-to-citation. Generation stays switched off.',
              },
              {
                term: 'Weeks 10–13 · Grounded synthesis',
                description:
                  'Extractive answers, refusal design, escalation routing, adversarial evaluation. Human review queue for every low-confidence response.',
              },
              {
                term: 'Weeks 14–16 · Validation pack and hand over',
                description:
                  'Evaluation evidence formatted for the quality system, runbooks, retraining and re-indexing procedures, pairing with the internal team.',
              },
            ],
          },
        ],
      },
      {
        label: 'Rationale',
        heading: 'What this brief demonstrates',
        blocks: [
          {
            type: 'p',
            text: 'Atlas is the argument that AI engagements should be judged on their evaluation harness, not their demo. Everything distinctive here — effectivity filtering, extractive answers, designed refusal, index-level permissions — comes from taking the consequences of a wrong answer seriously enough to let them shape the architecture.',
          },
        ],
      },
    ],
    metrics: [
      {
        label: 'Answer accuracy',
        value: '≥ 92%',
        method:
          'Golden set of 400 expert-authored questions, scored on exact governing-clause retrieval with correct revision. Run on every configuration change, versioned with the index.',
      },
      {
        label: 'Correct refusal',
        value: '≥ 95%',
        method:
          'Adversarial set of 120 unanswerable or conflicting questions. A confident wrong answer counts as a critical failure and blocks release.',
      },
      {
        label: 'Time to citation',
        value: '< 60 sec',
        method:
          'Instrumented median from query to a user opening the cited source, compared against a timed baseline of the current manual process (currently 40+ minutes).',
      },
    ],
    stack: [
      { group: 'Ingestion', items: ['Python', 'Layout-aware PDF parsing', 'Tesseract + confidence spans', 'Temporal'] },
      { group: 'Index', items: ['PostgreSQL', 'pgvector', 'OpenSearch (BM25)', 'Cross-encoder reranker'] },
      { group: 'Generation', items: ['Claude', 'Extractive answer contract', 'Citation validator'] },
      { group: 'Evaluation', items: ['Golden + adversarial suites', 'Promptfoo-style harness', 'Versioned result store'] },
      { group: 'Interface', items: ['Next.js', 'TypeScript', 'Document viewer with span anchors'] },
      { group: 'Governance', items: ['Index-level ACLs', 'Full query audit log', 'Validation evidence export'] },
    ],
    risks: [
      {
        risk: 'Scanned document quality is worse than believed and OCR poisons the index.',
        mitigation:
          'A corpus readability assessment is the first deliverable, before any retrieval work. Low-confidence spans are excluded from citation and surfaced as a remediation backlog rather than silently indexed.',
      },
      {
        risk: 'Effectivity metadata in the quality system is incomplete or contradictory.',
        mitigation:
          'Documents without resolvable effectivity are quarantined and never retrieved. The quarantine count is a headline metric — it makes a data problem visible instead of letting it become a model problem.',
      },
      {
        risk: 'Validation requirements stall the release indefinitely.',
        mitigation:
          'Quality assurance is in the room from week one and the evaluation harness is designed to emit validation evidence directly. The read-only retrieval release in week nine deliberately carries a lighter validation burden than generation.',
      },
    ],
  },

  {
    slug: 'halo',
    index: '003',
    name: 'Halo',
    title: 'An identity system that ships as software',
    sector: 'Design & brand',
    discipline: 'Creative Engineering',
    year: '2026',
    timeline: '10 weeks',
    seed: 3141,
    poster: 'orbit',
    excerpt:
      'A brand identity delivered as a generative engine rather than a PDF — one system producing every asset, in every medium, deterministically, forever.',
    premise:
      'Brand guidelines are a document describing a system that does not exist. Halo builds the system instead, and lets the document be generated from it.',
    sections: [
      {
        label: 'Context',
        heading: 'Why identity decays',
        blocks: [
          {
            type: 'p',
            text: 'An organisation commissions an identity. It arrives as a 90-page PDF, a font licence, a folder of logo variants and a set of principles about how the system should behave. Eighteen months later there are four hundred assets in circulation, a third of them off-system, and nobody can tell which are correct because correctness lives in a document that only the original studio ever fully understood.',
          },
          {
            type: 'p',
            text: 'The failure is that the interesting part of a modern identity is behavioural — how a form responds to a data input, how a colour relationship adapts across surfaces, how a motion signature reads at 200ms versus 2 seconds. None of that survives as prose. It survives as code, or it does not survive.',
          },
        ],
      },
      {
        label: 'Approach',
        heading: 'The identity as an executable',
        blocks: [
          {
            type: 'p',
            text: 'Halo treats the identity as a single deterministic function. Feed it a seed and a set of parameters — division, campaign, event date, data payload — and it produces the mark, the composition, the palette relationship and the motion, identically, on every run and on every platform. Two people generating the same asset a year apart get the same file, byte for byte.',
          },
          {
            type: 'defs',
            items: [
              {
                term: 'The core',
                description:
                  'A platform-agnostic TypeScript package holding the geometry, the constraint rules and the seeded random source. No rendering, no framework, no I/O. This is the identity; everything else is a renderer.',
              },
              {
                term: 'Renderers',
                description:
                  'SVG for print and vector delivery, Canvas 2D for bulk raster generation, WebGL for interactive surfaces, and a headless renderer running in CI for asset pipelines. Every renderer is pixel-tested against the same reference set.',
              },
              {
                term: 'The studio',
                description:
                  'A browser tool for non-engineers. Choose a context, adjust the exposed parameters, preview live, export to the formats you need. Anything the tool cannot produce is off-system by construction.',
              },
              {
                term: 'Tokens',
                description:
                  'Colour, type scale, spacing and motion curves emitted from one source into CSS custom properties, iOS and Android resources, Figma variables and a documentation site — on every release, from a version-tagged pipeline.',
              },
            ],
          },
          {
            type: 'code',
            language: 'ts',
            code: `// One function, many surfaces. Determinism is the whole contract.
const mark = compose({
  seed: hash('spring-campaign-2026'),
  density: 0.62,
  motion: 'settle',
  palette: 'signal',
})

renderSVG(mark)      // press-ready vector
renderCanvas(mark)   // 4000px social export
renderGL(mark, gl)   // live, 60fps, mouse-reactive
// identical geometry in all three, verified by CI pixel diff`,
          },
        ],
      },
      {
        label: 'System',
        heading: 'Motion as part of the specification',
        blocks: [
          {
            type: 'p',
            text: 'Motion is defined in the core as named signatures with fixed easing and duration relationships, not re-authored per project. A “settle” carries a specific overshoot and a specific relationship between the lead element and the trailing ones; that relationship holds whether it plays in a web hero, an app transition or a broadcast bumper.',
          },
          {
            type: 'p',
            text: 'Every signature ships with a reduced-motion counterpart authored at the same time — not a disabled state, an alternative expression. A system that becomes visually mute for the users who need it most is an incomplete system, and we treat it as a bug in the identity rather than a front-end concern.',
          },
          {
            type: 'note',
            label: 'Governance',
            text: 'The core is versioned semantically and published to a private registry. A breaking change to the mark is a major version with a migration note — the same discipline any other dependency gets, applied to the thing on the front of the building.',
          },
        ],
      },
      {
        label: 'Sequencing',
        heading: 'Ten weeks',
        blocks: [
          {
            type: 'defs',
            items: [
              {
                term: 'Weeks 1–2 · Constraint discovery',
                description:
                  'Work with the design team to convert intent into rules. What must always be true, what is free to vary, what breaks the identity. Output: a written constraint specification with worked counter-examples.',
              },
              {
                term: 'Weeks 3–5 · Core and SVG renderer',
                description:
                  'Deterministic geometry, seeded generation, reference asset set, pixel-diff CI. Design signs off against generated output, never mockups.',
              },
              {
                term: 'Weeks 6–8 · Canvas, WebGL and motion signatures',
                description:
                  'Bulk export pipeline, interactive renderer, motion library with reduced-motion counterparts, performance budgets enforced in CI.',
              },
              {
                term: 'Weeks 9–10 · Studio tool and hand over',
                description:
                  'The browser tool, token pipeline into every downstream platform, generated documentation site, and training for the in-house design team.',
              },
            ],
          },
        ],
      },
      {
        label: 'Rationale',
        heading: 'What this brief demonstrates',
        blocks: [
          {
            type: 'p',
            text: 'Halo is the clearest statement of what we mean by creative engineering: the design ambition is not compromised to fit the implementation, it is *encoded* in it. Determinism, pixel-diff testing, semantic versioning and CI performance budgets are ordinary engineering practices — pointed at a problem that usually receives none of them.',
          },
        ],
      },
    ],
    metrics: [
      {
        label: 'Asset compliance',
        value: '100%',
        method:
          'Every asset generated by the studio tool is on-system by construction. Compliance is measured as the share of published assets produced through the pipeline, tracked from the asset registry.',
      },
      {
        label: 'Time to campaign kit',
        value: '< 10 min',
        method:
          'Timed task: a designer with no engineering support produces a full cross-format kit for a new campaign. Baseline is currently two to three days of studio time.',
      },
      {
        label: 'Interactive frame budget',
        value: '60 fps / 4 ms',
        method:
          'WebGL renderer holds a 4ms frame budget on a mid-tier laptop and a three-year-old Android device. Enforced by an automated performance test in CI, not measured by eye.',
      },
    ],
    stack: [
      { group: 'Core', items: ['TypeScript', 'Deterministic PRNG', 'Constraint solver', 'Zero runtime deps'] },
      { group: 'Renderers', items: ['SVG', 'Canvas 2D', 'WebGL / GLSL', 'Headless Chromium'] },
      { group: 'Motion', items: ['GSAP', 'Named signatures', 'Reduced-motion counterparts'] },
      { group: 'Tooling', items: ['Next.js studio app', 'Style Dictionary', 'Figma variables API'] },
      { group: 'Quality', items: ['Pixel-diff CI', 'Performance budgets', 'Semantic versioning'] },
    ],
    risks: [
      {
        risk: 'The design team experiences the system as a constraint on creativity.',
        mitigation:
          'Designers co-author the constraint specification in weeks one and two and hold a standing veto on any rule. The tool exposes an explicit off-system export that is watermarked and logged — visible deviation beats invisible deviation.',
      },
      {
        risk: 'Determinism breaks across platforms through floating-point differences.',
        mitigation:
          'Geometry is computed in fixed-point integer space in the core and only converted to floats at render time. CI runs the reference set on three platforms and fails on any pixel drift.',
      },
      {
        risk: 'The system outlives the team that understands it.',
        mitigation:
          'Documentation is generated from the core with every release, and the handover includes two sessions where the in-house team ships a new signature themselves while we review.',
      },
    ],
  },

  {
    slug: 'ferry',
    index: '004',
    name: 'Ferry',
    title: 'Moving a decade-old monolith without a freeze',
    sector: 'B2B SaaS',
    discipline: 'Product Engineering · Technical Direction',
    year: '2026',
    timeline: '20 weeks',
    seed: 1618,
    poster: 'grid',
    excerpt:
      'A 600,000-line Rails monolith carrying $40M of ARR, a team that ships daily, and a board that has been told a rewrite is impossible. It is — so we would not do one.',
    premise:
      'The rewrite is not the risky part. The eighteen months during which two systems must both be true at once is the risky part, and that is the part nobody plans.',
    sections: [
      {
        label: 'Context',
        heading: 'The honest diagnosis',
        blocks: [
          {
            type: 'p',
            text: 'A profitable B2B platform, eleven years old, 600,000 lines, forty engineers. Deploys take fifty minutes. The test suite is flaky enough that a red build is assumed innocent until proven guilty. Three teams cannot ship independently because every change touches the same four models, and onboarding a senior engineer to productive output takes eleven weeks. Nobody thinks this is fine. Two previous attempts at a rewrite were cancelled at month nine.',
          },
          {
            type: 'p',
            text: 'The reflex answer — extract services — usually makes things worse first and stays worse, because the extraction is drawn along technical lines rather than transactional ones, and the resulting services need distributed transactions to do anything useful. You have converted a slow monolith into a slow monolith with network partitions.',
          },
          {
            type: 'quote',
            text: 'Every rewrite proposal should begin by stating what it will cost to run both systems simultaneously, for how long, and who is on call for the seam.',
          },
        ],
      },
      {
        label: 'Approach',
        heading: 'Cut along consistency boundaries, not code',
        blocks: [
          {
            type: 'p',
            text: 'The first four weeks produce no extraction at all. They produce a map: which data actually needs to be transactionally consistent with which, derived from the queries and write patterns in production rather than from the domain model on the wiki. Those clusters are the only defensible service boundaries. Everything else is a preference.',
          },
          {
            type: 'list',
            ordered: true,
            items: [
              'Instrument the monolith to capture real read and write co-occurrence over a full billing cycle, including the month-end paths nobody remembers until they break.',
              'Cluster tables by transactional coupling. Where clusters disagree with the org chart, the org chart is usually the thing that is wrong — say so early.',
              'Pick the first extraction on two criteria only: it is genuinely loosely coupled, and it is causing pain this quarter. Strategic-but-painless extractions never get finished.',
              'Build the seam before the service: a routing layer, dual-write with reconciliation, and a comparison harness that runs both implementations against production traffic and reports divergence.',
            ],
          },
          {
            type: 'note',
            label: 'The rule',
            text: 'No extraction begins without a written rollback that can be executed in under ten minutes by whoever is on call, tested in staging, and rehearsed once with the actual on-call rota before the first percent of traffic moves.',
          },
        ],
      },
      {
        label: 'System',
        heading: 'The seam is the product',
        blocks: [
          {
            type: 'defs',
            items: [
              {
                term: 'Routing layer',
                description:
                  'A single place that decides, per request and per tenant, which implementation serves. Percentage rollout, instant rollback, and a kill switch that does not require a deploy.',
              },
              {
                term: 'Shadow comparison',
                description:
                  'The new implementation runs against real traffic and its output is compared to the monolith’s without being served. Divergence is reported per field, not per response — a 0.3% mismatch on one attribute is a bug, not noise.',
              },
              {
                term: 'Reconciliation',
                description:
                  'While both systems write, a continuous job compares state and repairs drift, with every repair logged. When the repair rate reaches zero for two weeks, the old write path is deleted — deleted, not deprecated.',
              },
              {
                term: 'Deletion ledger',
                description:
                  'A public count of lines and endpoints removed from the monolith. The migration is measured by what has been deleted, never by what has been written.',
              },
            ],
          },
          {
            type: 'code',
            language: 'rb',
            code: `# The seam: one decision point, instant reversal, divergence measured per field.
class BillingRouter
  def call(request)
    legacy = -> { Monolith::Billing.call(request) }
    modern = -> { BillingService.call(request) }

    case Flags.mode(:billing, tenant: request.tenant)
    when :legacy  then legacy.call
    when :shadow  then legacy.call.tap { |truth| Compare.async(truth, modern) }
    when :modern  then modern.call
    end
  end
end`,
          },
        ],
      },
      {
        label: 'Sequencing',
        heading: 'Twenty weeks to a repeatable pattern',
        blocks: [
          {
            type: 'defs',
            items: [
              {
                term: 'Weeks 1–4 · Map',
                description:
                  'Production coupling analysis, boundary proposal, delivery metrics baseline, and an honest assessment of what the monolith should simply keep doing forever.',
              },
              {
                term: 'Weeks 5–8 · Build the seam',
                description:
                  'Routing layer, flags, shadow comparison, reconciliation harness, rollback rehearsal. No business logic is moved in this phase.',
              },
              {
                term: 'Weeks 9–16 · First two extractions',
                description:
                  'One high-pain, low-coupling service taken to 100% traffic and the legacy path deleted. Then a second, run by your engineers with us reviewing.',
              },
              {
                term: 'Weeks 17–20 · Make it repeatable',
                description:
                  'Extraction playbook, templates, a decision record per boundary, and a twelve-month sequenced plan your team executes without us.',
              },
            ],
          },
          {
            type: 'p',
            text: 'Note what is absent: a target architecture diagram showing forty microservices. The end state we would argue for is a well-factored monolith with three or four genuinely independent services around it, and a team that can extract the fifth one on its own if it ever becomes necessary.',
          },
        ],
      },
      {
        label: 'Rationale',
        heading: 'What this brief demonstrates',
        blocks: [
          {
            type: 'p',
            text: 'Ferry is here because it is the engagement where the most valuable thing we can do is talk a client *out* of the project they asked for and into the one that works. It also shows what technical direction looks like in practice: measurement before opinion, deletion as the success metric, and a rollback rehearsed with the people who would actually have to execute it at 3am.',
          },
        ],
      },
    ],
    metrics: [
      {
        label: 'Deploy time',
        value: '50 → 8 min',
        method:
          'Median pipeline duration from merge to production, sampled weekly. Reported alongside change failure rate so speed cannot be bought with instability.',
      },
      {
        label: 'Lines deleted',
        value: '> 60k',
        method:
          'Net lines removed from the monolith, published weekly. Extraction only counts once the legacy path is deleted — parallel implementations score zero.',
      },
      {
        label: 'Divergence at cutover',
        value: '< 0.01%',
        method:
          'Field-level mismatch rate between shadow and legacy responses over the seven days preceding each traffic cutover. Anything above threshold blocks the rollout.',
      },
    ],
    stack: [
      { group: 'Legacy', items: ['Ruby on Rails', 'PostgreSQL', 'Sidekiq'] },
      { group: 'Extraction', items: ['Go services', 'gRPC + Protobuf', 'Outbox pattern', 'Kafka'] },
      { group: 'Seam', items: ['Routing layer', 'Feature flags', 'Shadow comparison harness', 'Reconciliation jobs'] },
      { group: 'Delivery', items: ['GitHub Actions', 'Progressive rollout', 'DORA metrics dashboard'] },
      { group: 'Observability', items: ['OpenTelemetry', 'Distributed tracing', 'Per-field divergence reporting'] },
    ],
    risks: [
      {
        risk: 'Feature delivery stalls and the business loses patience by month four.',
        mitigation:
          'Extractions are chosen for near-term pain relief, and the roadmap keeps shipping throughout — the seam is designed so product work continues in the monolith unaffected. The deletion ledger gives leadership a weekly, legible signal of progress.',
      },
      {
        risk: 'Dual-write introduces data corruption under load.',
        mitigation:
          'Writes go through an outbox with idempotency keys, reconciliation runs continuously, and no cutover happens while the repair rate is non-zero. Shadow mode carries no write path at all.',
      },
      {
        risk: 'The team treats the new services as greenfield and re-creates the coupling.',
        mitigation:
          'Boundaries are enforced by a written decision record and by build-time dependency checks. Any cross-boundary transaction requires an architecture review — which is deliberately mild friction, not a ban.',
      },
    ],
  },

  {
    slug: 'lumen',
    index: '005',
    name: 'Lumen',
    title: 'Making a building’s energy legible in real time',
    sector: 'Climate & property',
    discipline: 'Creative Engineering · Realtime Data',
    year: '2026',
    timeline: '12 weeks',
    seed: 2357,
    poster: 'bloom',
    excerpt:
      'Commercial buildings publish an annual energy rating nobody reads. Lumen renders consumption as it happens — in the lobby, on the floor plate, and in the tenant’s inbox.',
    premise:
      'People do not change behaviour because of a number in a quarterly report. They change it when the consequence is visible, immediate and attached to something they recognise as theirs.',
    sections: [
      {
        label: 'Context',
        heading: 'The gap between metering and meaning',
        blocks: [
          {
            type: 'p',
            text: 'A modern commercial tower is already comprehensively metered. Sub-metering per floor, per riser, sometimes per tenant. HVAC telemetry at minute resolution. The building management system holds all of it and presents it as trend graphs to a facilities manager who is fluent in them and to nobody else. Tenants — who pay for the energy, and whose behaviour drives a meaningful share of it — see a line item on an invoice ninety days later.',
          },
          {
            type: 'p',
            text: 'Meanwhile the property owner has reporting obligations, a decarbonisation commitment with a date attached, and no mechanism to influence the thousands of daily decisions that actually determine consumption. The data exists. The feedback loop does not.',
          },
        ],
      },
      {
        label: 'Approach',
        heading: 'One model, three audiences, three tempos',
        blocks: [
          {
            type: 'p',
            text: 'The same underlying stream serves three quite different needs, and the design mistake would be to build one interface and let all three compromise on it.',
          },
          {
            type: 'defs',
            items: [
              {
                term: 'The lobby — seconds',
                description:
                  'A large-format ambient display. No axes, no legend, no numbers to read. A WebGL field whose density, motion and warmth track live consumption against the same weekday last month. Comprehensible in the two seconds someone glances at it while waiting for a lift.',
              },
              {
                term: 'The tenant — days',
                description:
                  'A floor-level view: your consumption, your comparison set, the three largest contributors, and what changed since last week. Delivered as a weekly digest, because a dashboard nobody opens is not a feedback loop.',
              },
              {
                term: 'The operator — minutes',
                description:
                  'The working tool. Anomaly detection against a weather-and-occupancy-normalised baseline, drill-down to riser and asset level, and an event log of interventions with their measured effect.',
              },
            ],
          },
          {
            type: 'p',
            text: 'Normalisation is the technical heart of it. Raw consumption is meaningless as a comparison — a hot Thursday with a full floor is not comparable to a mild Tuesday at half occupancy. Every figure shown to a human is normalised against degree-days and occupancy, and the interface always exposes what the normalisation did, because a number the user cannot interrogate is a number they will eventually stop believing.',
          },
        ],
      },
      {
        label: 'System',
        heading: 'Honest realtime',
        blocks: [
          {
            type: 'p',
            text: 'Building telemetry is unreliable in specific, predictable ways: meters drop out, gateways buffer and replay, clocks drift, and a sensor that has failed reports a plausible constant rather than nothing. A realtime interface that renders all of this as smooth continuous truth is lying, and it will be caught lying at the worst possible moment.',
          },
          {
            type: 'list',
            items: [
              'Every reading carries a freshness stamp and a quality flag through the whole pipeline, into the rendering layer.',
              'The ambient display degrades visibly — the field slows and desaturates — when data is stale, so the failure mode is legible from across a lobby.',
              'Stuck-sensor detection flags constant values against expected variance and quarantines the meter rather than averaging it into a floor total.',
              'Late-arriving data is reconciled and any published figure that changes materially is annotated with what changed and when.',
            ],
          },
          {
            type: 'code',
            language: 'ts',
            code: `// Freshness is part of the value, not metadata bolted alongside it.
type Reading = {
  meterId: string
  kwh: number
  observedAt: number
  receivedAt: number
  quality: 'ok' | 'stale' | 'suspect' | 'quarantined'
}

// The renderer consumes quality directly — stale data looks stale.
field.setParams({
  intensity: normalise(reading, { degreeDays, occupancy }),
  saturation: reading.quality === 'ok' ? 1 : 0.35,
  drift: age(reading) / STALE_AFTER,
})`,
          },
        ],
      },
      {
        label: 'Sequencing',
        heading: 'Twelve weeks',
        blocks: [
          {
            type: 'defs',
            items: [
              {
                term: 'Weeks 1–3 · Signal audit',
                description:
                  'Meter inventory, data quality assessment, normalisation model built and validated against twelve months of history and known interventions.',
              },
              {
                term: 'Weeks 4–7 · Operator tool',
                description:
                  'Ingestion, anomaly detection, drill-down, intervention log. The facilities team uses it daily before anything is shown publicly.',
              },
              {
                term: 'Weeks 8–10 · Lobby and tenant surfaces',
                description:
                  'WebGL ambient display with quality-aware degradation, tenant view and weekly digest pipeline, hardware install and calibration.',
              },
              {
                term: 'Weeks 11–12 · Hand over',
                description:
                  'Runbooks for meter onboarding, normalisation retraining schedule, content controls for the display, and pairing with the in-house team.',
              },
            ],
          },
        ],
      },
      {
        label: 'Rationale',
        heading: 'What this brief demonstrates',
        blocks: [
          {
            type: 'p',
            text: 'Lumen sits deliberately across two disciplines. The ambient display is the kind of work that gets a site noticed; the normalisation model and the quality pipeline are the reason it would still be trusted in month six. We are interested in the engagements where both halves matter, and sceptical of the ones where only the first does.',
          },
        ],
      },
    ],
    metrics: [
      {
        label: 'Normalised consumption',
        value: '−8% / yr',
        method:
          'Weather- and occupancy-normalised kWh per square metre, year over year, with a matched control floor where no surfaces are deployed. Attribution is stated as correlational, not causal.',
      },
      {
        label: 'Anomaly lead time',
        value: '< 30 min',
        method:
          'Median time from a consumption anomaly beginning to the operator being alerted, versus a baseline established from the current monthly review cycle.',
      },
      {
        label: 'Display frame cost',
        value: '≤ 6 ms',
        method:
          'Frame time on the target lobby hardware over a 72-hour soak test, including a memory-growth check — this display never gets restarted.',
      },
    ],
    stack: [
      { group: 'Edge', items: ['BACnet / Modbus gateways', 'MQTT', 'Store-and-forward buffering'] },
      { group: 'Pipeline', items: ['Go ingestion', 'TimescaleDB', 'Quality flagging', 'Late-arrival reconciliation'] },
      { group: 'Modelling', items: ['Degree-day normalisation', 'Occupancy weighting', 'Seasonal anomaly detection'] },
      { group: 'Surfaces', items: ['Next.js', 'WebGL / GLSL', 'Server-sent events', 'Kiosk runtime'] },
      { group: 'Delivery', items: ['Weekly digest pipeline', 'Terraform', 'Grafana', 'Uptime alerting'] },
    ],
    risks: [
      {
        risk: 'Meter coverage is incomplete and floor-level attribution is contested by tenants.',
        mitigation:
          'Coverage is measured and published per floor in week one. Any floor below the confidence threshold shows a range instead of a figure — never a precise number the data cannot support.',
      },
      {
        risk: 'The ambient display becomes wallpaper within a fortnight.',
        mitigation:
          'The composition changes with the comparison state rather than looping, and the weekly digest carries the specific asks. The display is designed to inform, not to be the intervention.',
      },
      {
        risk: 'Behaviour change is claimed without evidence.',
        mitigation:
          'A matched control floor is established before deployment, and every published figure states its normalisation method. We would rather report a smaller defensible number than a large one that collapses under scrutiny.',
      },
    ],
  },
];

export function getConcept(slug: string): Concept | undefined {
  return concepts.find((concept) => concept.slug === slug);
}
