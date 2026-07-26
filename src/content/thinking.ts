import type { Essay } from './types';

/**
 * Long-form writing. The studio publishes its reasoning before anyone
 * commissions it — these essays are the argument for how we work.
 */
export const essays: Essay[] = [
  {
    slug: 'the-cost-of-a-rewrite',
    index: '01',
    title: 'The cost of a rewrite is never the rewrite',
    excerpt:
      'Every rewrite proposal budgets for building the new system. Almost none budget for the eighteen months in which two systems must both be true at once — which is where the money and the morale actually go.',
    date: '2026-07-02',
    readingTime: '7 min',
    topic: 'Architecture',
    seed: 8123,
    blocks: [
      {
        type: 'p',
        text: 'Ask an engineering team what a rewrite will cost and you will get an estimate for building the replacement. It is usually a decent estimate — engineers are better at sizing greenfield work than they are given credit for. It is also an answer to a question nobody should have asked, because the replacement is the cheap part.',
      },
      {
        type: 'p',
        text: 'The expensive part is the *interregnum*: the period, invariably longer than planned, in which the old system and the new system are both live, both authoritative for something, and both on call. That period has a cost structure of its own, and it is almost never on the slide.',
      },
      { type: 'h2', text: 'What the interregnum actually costs' },
      {
        type: 'p',
        text: 'Start with the obvious line item: every feature shipped during the migration is shipped twice, or shipped once and then ported. Product does not stop. Sales has already sold the roadmap. So the true delivery cost of the migration includes a tax on every unrelated piece of work for its entire duration, and that tax compounds because the second implementation is always written by someone with less context than the first.',
      },
      {
        type: 'p',
        text: 'Then the seam. Two systems that must agree require a mechanism to make them agree: dual writes, reconciliation, comparison harnesses, a routing layer, feature flags with tenant-level granularity, and a rollback that someone can execute at three in the morning without reading a wiki. That machinery is real engineering — often the most demanding engineering in the project — and it is thrown away at the end. Teams routinely under-budget it by an order of magnitude because it does not map to a user-visible feature.',
      },
      {
        type: 'p',
        text: 'Then the operational surface. Two deployment pipelines, two alerting configurations, two sets of dashboards, two mental models for whoever is on call. Incident response degrades measurably during migrations, not because the systems are worse but because the first question in any incident becomes “which one is this?”',
      },
      {
        type: 'p',
        text: 'And finally the part nobody writes down: the morale cost of a project whose visible progress is zero for months. Rewrites fail at month nine with striking regularity, and it is rarely a technical failure. It is that the organisation ran out of belief before the new system ran out of unknowns.',
      },
      {
        type: 'quote',
        text: 'A rewrite plan that does not state the duration of the dual-running period, its carrying cost, and who is on call for the seam is not a plan. It is an aspiration with a Gantt chart.',
      },
      { type: 'h2', text: 'The reframe: measure deletion, not construction' },
      {
        type: 'p',
        text: 'The single most useful change a team can make to a migration is to change what it reports. Stop measuring the new system’s progress. Measure how much of the old system has been *deleted*.',
      },
      {
        type: 'p',
        text: 'This is not a motivational trick. It is an accounting correction. A new service that runs in parallel with the code it was meant to replace has produced negative value: it added operational surface without removing any. Value appears at the moment the legacy path is deleted and the dual-running cost for that slice stops. Reporting on deletion makes the incentive point at the finish line rather than the start.',
      },
      {
        type: 'p',
        text: 'It also changes behaviour in a useful way. Teams measured on deletion take smaller slices, because a small slice can actually be finished. Teams measured on construction take large slices, because large slices demo better. The first team is still deleting code in month twelve; the second is explaining why month nine slipped.',
      },
      { type: 'h2', text: 'Choose boundaries the database agrees with' },
      {
        type: 'p',
        text: 'Most extraction plans are drawn from a domain model on a whiteboard. The whiteboard reflects how the business talks about itself, which is valuable but is not evidence about coupling. The evidence lives in production: which tables are read and written inside the same transaction, which queries join across which entities, and which paths only appear at month end.',
      },
      {
        type: 'p',
        text: 'Instrument first. Cluster tables by transactional co-occurrence over a full business cycle. The clusters that emerge are the only boundaries you can extract without inventing a distributed transaction, and they frequently disagree with both the whiteboard and the org chart. When they disagree with the org chart, that is worth saying out loud early, because Conway’s law will otherwise settle the argument quietly and badly.',
      },
      { type: 'h2', text: 'The rewrite you should usually do' },
      {
        type: 'p',
        text: 'After the mapping exercise, the honest recommendation is frequently unpopular: keep the monolith, fix its worst three properties, and extract two or three services that genuinely need independent scaling or independent release cadence. A well-factored monolith with a fast test suite and an eight-minute deploy beats a distributed system nobody can debug, on every metric a business cares about.',
      },
      {
        type: 'p',
        text: 'That recommendation is hard to sell, because “we made deploys six times faster and deleted sixty thousand lines” is a less exciting board slide than “we are moving to microservices”. It is also, in most cases, the correct answer — and telling a client the correct answer when it shrinks the engagement is the entire basis on which anyone should hire an outside studio.',
      },
      {
        type: 'note',
        label: 'Before you start',
        text: 'Write down three numbers: how long both systems will run in parallel, the monthly carrying cost of that period, and the date on which the legacy path for slice one gets deleted. If nobody will commit to the third number, the project is not ready to begin.',
      },
    ],
  },

  {
    slug: 'evals-are-the-product',
    index: '02',
    title: 'Your eval suite is the product',
    excerpt:
      'The demo takes an afternoon. Everything that decides whether the feature survives contact with real users is the apparatus around it — and that apparatus is what you are actually buying.',
    date: '2026-06-18',
    readingTime: '8 min',
    topic: 'AI Systems',
    seed: 4177,
    blocks: [
      {
        type: 'p',
        text: 'There is a specific meeting that happens in every company shipping its first serious AI feature. An engineer demos something genuinely impressive. The room is delighted. Someone asks how long until it launches, and the honest answer — six months — sounds absurd against a demo that took four days. The gap between those two numbers is the entire discipline.',
      },
      {
        type: 'p',
        text: 'What closes it is not model quality. It is the apparatus: the evaluation harness, the retrieval design, the guardrails, the refusal path, the observability, and the human review loop. That apparatus is unglamorous, it never demos well, and it is the only reason the feature is still switched on a year later.',
      },
      { type: 'h2', text: 'You cannot improve what you cannot score' },
      {
        type: 'p',
        text: 'The first question to ask about any AI feature is mundane: how would we know if a change made it worse? Teams without an answer are not iterating, they are wandering. A prompt gets tweaked, the demo query still looks good, and a regression ships that nobody notices for five weeks because nobody was measuring the thing that broke.',
      },
      {
        type: 'p',
        text: 'A usable evaluation suite has three parts. A *golden set* of real questions with verified answers, written by people who actually know the domain — not generated, because generated questions encode the model’s own assumptions about what is askable. An *adversarial set* built specifically to induce failure: ambiguous phrasing, questions with no valid answer, near-duplicate sources that disagree, and the edge cases your domain experts flinch at. And a *regression gate* wired into CI so no configuration reaches production without clearing both.',
      },
      {
        type: 'p',
        text: 'Four hundred golden questions and a hundred adversarial ones is enough to be useful and small enough to actually get written. The work is two weeks of domain-expert time. Every team that skips it spends far more than two weeks later, in a worse mood, arguing about whether the system got better.',
      },
      { type: 'h2', text: 'Refusal is a feature, not an error state' },
      {
        type: 'p',
        text: 'Most systems treat "I don\'t know" as a failure to be minimised. In any domain with consequences, it is the second most valuable thing the system can say, and the design of that moment deserves as much attention as the happy path.',
      },
      {
        type: 'list',
        items: [
          'Refusal needs its own threshold, tuned deliberately, with a stated cost trade-off between wrong answers and unnecessary escalations.',
          'It needs its own interface — a named human owner and a route to them, not a shrug rendered in a chat bubble.',
          'It needs its own metric. In the systems we design, correct-refusal rate is a release gate; a confident wrong answer counts as a critical failure and blocks the build.',
          'And it needs to be measurable against a set of questions that genuinely have no answer, which means someone has to write them.',
        ],
      },
      {
        type: 'quote',
        text: 'A system that is right 95% of the time and cannot tell you which 5% is less useful than one that is right 85% of the time and knows when it is guessing.',
      },
      { type: 'h2', text: 'Ground the prose in a structure' },
      {
        type: 'p',
        text: 'The most common architectural mistake is letting a language model be the source of facts rather than a view over them. The fix is a contract: deterministic code produces a structured findings object, and generation is restricted to writing prose about that object. A validator drops any sentence that cannot be traced back to it.',
      },
      {
        type: 'p',
        text: 'This caps the worst-case failure at awkward phrasing rather than fabricated fact. It makes every claim linkable to its evidence, which is what users need in order to trust — and, crucially, to *disagree with* — the system. And it means swapping models is a routine dependency change rather than a re-validation of everything the product asserts.',
      },
      { type: 'h2', text: 'Retrieval is where the quality actually lives' },
      {
        type: 'p',
        text: 'Teams spend weeks on prompt phrasing and an afternoon on chunking strategy, when the ratio should be inverted. If the right passage never enters the context window, no amount of prompt engineering recovers it. Chunk along document structure rather than token counts, keep hybrid lexical and semantic retrieval because users search by identifier as often as by concept, rerank aggressively, and enforce permissions at the index rather than the answer.',
      },
      {
        type: 'p',
        text: 'That last point catches people out. Filtering citations after generation leaks exactly what the permission model exists to protect: the summary already contains the restricted content. If a user cannot open a document, the retriever must not be able to see it either.',
      },
      { type: 'h2', text: 'Sometimes the answer is a database query' },
      {
        type: 'p',
        text: 'The most valuable thing an engineer can say in an AI planning meeting is that this particular problem is a join, a filter and a well-designed table view — and would be faster, cheaper, auditable and correct every time. A studio that cannot say that is not offering judgement, it is offering enthusiasm.',
      },
      {
        type: 'note',
        label: 'The test',
        text: 'Before building, write down what a wrong answer costs and who bears it. If the answer is "an awkward moment", ship fast and iterate. If it is "a regulatory finding", the evaluation harness comes first — and it is the deliverable that will still be earning its keep in three years.',
      },
    ],
  },

  {
    slug: 'motion-is-load-bearing',
    index: '03',
    title: 'Motion is a load-bearing material',
    excerpt:
      'Animation is not decoration applied after the interface works. It is how software explains causality — and treating it as polish is why most of it feels like noise.',
    date: '2026-05-29',
    readingTime: '6 min',
    topic: 'Creative Engineering',
    seed: 6291,
    blocks: [
      {
        type: 'p',
        text: 'There is a version of interface animation that everyone has learned to dislike: things that slide in for no reason, hovers that wobble, page transitions that add three hundred milliseconds to every navigation in service of nothing. The reasonable conclusion many engineers draw is that motion is decoration and decoration is cost.',
      },
      {
        type: 'p',
        text: 'The conclusion is wrong, but the evidence for it is real. What is being observed is not motion failing — it is motion applied without a job.',
      },
      { type: 'h2', text: 'The job' },
      {
        type: 'p',
        text: 'Motion answers questions that static interfaces cannot: where did this come from, what does it belong to, what just changed, and is the system still working. Those are the four questions a user asks continuously and mostly unconsciously. Answer them with movement and the interface feels obvious. Answer them with nothing and the user does the work — which is experienced not as "this lacks polish" but as "this is confusing".',
      },
      {
        type: 'defs',
        items: [
          {
            term: 'Origin',
            description:
              'A panel that grows from the control that opened it has explained its own provenance. The same panel fading in from nowhere requires the user to reconstruct the relationship.',
          },
          {
            term: 'Grouping',
            description:
              'Elements that move together are read as belonging together. A stagger sequence is a statement about hierarchy, and a wrong stagger asserts a wrong hierarchy.',
          },
          {
            term: 'Change',
            description:
              'When a value updates without motion, users miss it. A brief highlight decaying over 600ms is the difference between a number that changed and a number nobody noticed changing.',
          },
          {
            term: 'Liveness',
            description:
              'During waits, motion is the only channel that says the system is still alive. This is why a determinate progress indicator that moves beats an accurate one that does not.',
          },
        ],
      },
      { type: 'h2', text: 'Choreography beats animation' },
      {
        type: 'p',
        text: 'Most motion problems in a codebase are not individually bad animations. They are the absence of a system — forty durations, nine easing curves, and no shared vocabulary, so nothing relates to anything else. The output feels chaotic even when each piece is defensible in isolation.',
      },
      {
        type: 'p',
        text: 'The fix is the same one we apply to colour and type: a small set of named signatures with fixed relationships. Three durations. Two or three curves with clear semantics — an exit is not an entrance played backwards. A stagger interval derived from the count of elements rather than picked per component. When the vocabulary is small, unrelated parts of a product move as though they were designed together, because they were.',
      },
      {
        type: 'quote',
        text: 'If your motion cannot be described in a paragraph, users cannot learn it — and motion that cannot be learned is noise with a frame budget.',
      },
      { type: 'h2', text: 'Reduced motion is a design problem' },
      {
        type: 'p',
        text: 'The common implementation of `prefers-reduced-motion` is to switch everything off. That is better than ignoring it, and it is still a failure: the user who most needs the interface to explain itself gets the version that explains nothing.',
      },
      {
        type: 'p',
        text: 'The better approach is to author the reduced variant at the same time as the primary one, as an alternative expression rather than an absence. Translation and parallax become opacity and colour. Long sequences collapse into single transitions. Anything vestibular — large-scale movement, continuous rotation, parallax on scroll — is removed entirely rather than shortened. The information the motion carried survives; the mechanism changes.',
      },
      { type: 'h2', text: 'The frame budget is the honesty check' },
      {
        type: 'p',
        text: 'Motion is the one area of front-end work where ambition is trivially checkable: does it hold sixty frames on the hardware your users actually own? Not on the machine it was built on. The discipline is ordinary engineering — budget set before the work begins, animate only compositor-friendly properties, measure on a real mid-tier device, and put the check in CI so regressions fail a build instead of a launch.',
      },
      {
        type: 'p',
        text: 'A studio that ships beautiful work which janks on a three-year-old Android has not delivered the design. It has delivered a screenshot of it.',
      },
      {
        type: 'note',
        label: 'A rule we hold',
        text: 'Every animation in our work has to survive one question: what does the user misunderstand if this is removed? If the answer is "nothing", it gets removed — and the frames it was spending go somewhere they are load-bearing.',
      },
    ],
  },

  {
    slug: 'small-by-design',
    index: '04',
    title: 'Small by design',
    excerpt:
      'Five people is not a stage the studio is trying to grow out of. It is the constraint that makes the rest of the model possible — and the reason we turn work away.',
    date: '2026-05-11',
    readingTime: '5 min',
    topic: 'Studio',
    seed: 1729,
    blocks: [
      {
        type: 'p',
        text: 'The default trajectory of a successful studio is legible to everyone in it: win more work than you can do, hire to cover it, sell the senior people who won the work while juniors deliver it, and manage the resulting quality gap with process. This is not cynicism — it is simply what growth does to a services business, reliably, and it is why so many clients describe the same arc from delight to disappointment.',
      },
      {
        type: 'p',
        text: 'Seventeen Studios caps at five people. That is a structural decision, not an ambition we have not yet outgrown.',
      },
      { type: 'h2', text: 'What the cap buys' },
      {
        type: 'defs',
        items: [
          {
            term: 'The people you meet are the people who build',
            description:
              'There is no pyramid to hide behind, no delivery team you have not spoken to. If we cannot staff an engagement with people we would hire twice, we decline it rather than fill the gap.',
          },
          {
            term: 'Saying no is survivable',
            description:
              'A studio with thirty salaries takes the work it can get. A studio with five takes the work it should. That difference shows up as advice you can trust, particularly the advice that shrinks the engagement.',
          },
          {
            term: 'No communication overhead tax',
            description:
              'Five people need no programme manager, no status ceremony, no weekly deck. That time goes into the work, which is the only reason a studio this size can compete with a team four times larger.',
          },
          {
            term: 'Accountability has nowhere to go',
            description:
              'When something is wrong, there are five people it could be. Diffusion of responsibility is a large-organisation disease, and the cure is not a process, it is a headcount limit.',
          },
        ],
      },
      { type: 'h2', text: 'What it costs' },
      {
        type: 'p',
        text: 'The trade-offs are real and worth stating plainly. We cannot absorb a sudden doubling of scope; the answer is a longer timeline or a smaller scope, never a hastily assembled team. We are unavailable more often than we would like — two engagements at a time is the honest capacity. And we are not the right choice for work that genuinely needs thirty engineers, which exists and which we will say so about.',
      },
      {
        type: 'p',
        text: 'There is also a resilience cost. Five people means key-person risk, and pretending otherwise would be dishonest. We manage it the only way that works: no engagement is ever staffed by one person, every decision is written down as it is made, and the handover is designed from week one rather than assembled at the end.',
      },
      {
        type: 'quote',
        text: 'We would rather be the studio three companies call first than the studio thirty companies call once.',
      },
      { type: 'h2', text: 'Why this matters to a client' },
      {
        type: 'p',
        text: 'Because it changes what our incentives point at. A studio paid by the hour benefits from duration. A studio paid by the seat benefits from headcount. A studio with a hard cap and outcome-based pricing benefits from one thing only: finishing well, early enough to take the next engagement, with a client who will recommend us. Every structural decision here exists to keep that the only way we win.',
      },
      {
        type: 'note',
        label: 'In practice',
        text: 'Two concurrent engagements. Two senior engineers each. A principal across both. The fifth seat stays deliberately unallocated — for the diagnostic work, the reviews, and the slack that makes the other four sustainable.',
      },
    ],
  },

  {
    slug: 'latency-is-a-feature',
    index: '05',
    title: 'Latency is a feature you can sell',
    excerpt:
      'Performance work loses budget arguments because it is framed as maintenance. Framed as what it is — a conversion, retention and cost lever — it wins them.',
    date: '2026-04-24',
    readingTime: '6 min',
    topic: 'Engineering',
    seed: 5039,
    blocks: [
      {
        type: 'p',
        text: 'Performance is the only engineering work that consistently loses prioritisation battles to features that are worth less. Not because anyone believes slow software is good, but because "make it faster" is presented as hygiene, and hygiene is always deferrable. The framing is the problem.',
      },
      { type: 'h2', text: 'Three arguments that actually land' },
      {
        type: 'p',
        text: 'The first is behavioural. Latency changes what users do, not just how they feel. Above roughly a second, users lose their train of thought; above ten, they leave and come back to something else. A tool that responds in 200ms gets used exploratorily — people try things. The same tool at three seconds gets used defensively: people plan their queries to avoid waiting, and the product quietly becomes something narrower than it was designed to be.',
      },
      {
        type: 'p',
        text: 'The second is economic. Slow systems are usually inefficient systems, and inefficiency has a cloud bill attached. A query path optimised from 800ms to 90ms typically drops compute cost by a similar order, and that saving recurs monthly with no further work. This argument is available to anyone willing to attach a dollar figure to a flame graph, and it is startling how rarely anyone does.',
      },
      {
        type: 'p',
        text: 'The third is organisational, and it is the one that persuades engineering leaders. Slow builds and slow test suites tax every change your team will ever make. A fifty-minute pipeline does not cost fifty minutes; it costs the context switch, the batched-up risky merges, and the reviews that happen at the end of the day because nobody wants to start something they cannot finish. Cutting it to eight minutes is a compounding productivity change disguised as infrastructure work.',
      },
      {
        type: 'quote',
        text: 'Nobody funds "make the page faster". Everybody funds "reduce the time from question to answer", which is the same project with an honest name.',
      },
      { type: 'h2', text: 'Budgets before code' },
      {
        type: 'p',
        text: 'Performance defended after the fact is performance lost. The mechanism that works is a budget set before the first commit and enforced automatically: a number for the interaction latency, a number for the payload, a number for the frame time — each attached to a specific device class, not to a developer laptop.',
      },
      {
        type: 'list',
        items: [
          'Set the budget against the hardware your users actually have. A three-year-old mid-tier Android and a coffee-shop connection is a fair target for most consumer products.',
          'Enforce it in CI. A budget nobody can breach without failing a build is a constraint; a budget in a document is a preference.',
          'Measure percentiles, not averages. The mean hides the users you are losing; p95 is where they live.',
          'Attach an owner. Unowned budgets erode invisibly over a couple of quarters and nobody can point at when it happened.',
        ],
      },
      { type: 'h2', text: 'Where the time actually is' },
      {
        type: 'p',
        text: 'Almost always: a database query with no supporting index, an N+1 hiding behind an ORM, a payload shipping fields nobody renders, an unbounded fan-out to a service that got slower, or a render path recomputing something on every frame that changes twice a minute. This list is boring, and it accounts for the overwhelming majority of real-world latency.',
      },
      {
        type: 'p',
        text: 'Which is why the first rule of performance work is to measure before optimising, and the second is to be extremely suspicious of any performance project whose first proposed step is a rewrite in a faster language. The rewrite is occasionally correct. It is much more often an expensive way to avoid reading a query plan.',
      },
      {
        type: 'note',
        label: 'A useful exercise',
        text: 'Take your slowest common user journey. Write down where the time goes, in milliseconds, from click to usable. Most teams cannot do this from memory — and the act of producing the number is usually enough to make the next quarter’s priority obvious without an argument.',
      },
    ],
  },

  {
    slug: 'against-the-discovery-phase',
    index: '06',
    title: 'Against the discovery phase',
    excerpt:
      'Six weeks of workshops produce a document, a shared vocabulary and a false sense of certainty. Three weeks of building the riskiest thing produce evidence. Only one of those survives contact with the work.',
    date: '2026-04-03',
    readingTime: '6 min',
    topic: 'Process',
    seed: 9973,
    blocks: [
      {
        type: 'p',
        text: 'The standard opening move of a professional services engagement is a discovery phase. Four to six weeks of stakeholder interviews, workshops, journey maps and a requirements document, ending in a presentation and a plan. It is billable, it is comfortable, and it demonstrates seriousness.',
      },
      {
        type: 'p',
        text: 'It also systematically produces the wrong artefact, because the output of discovery is a *description*, and descriptions cannot be wrong in any way that is detectable before you build. A beautifully specified plan and a badly specified plan look identical in a slide deck. They diverge in week nine.',
      },
      { type: 'h2', text: 'What discovery is really for' },
      {
        type: 'p',
        text: 'To be fair to it: some of what discovery does is essential. Learning the domain vocabulary, meeting the people who will have opinions later, understanding the constraints nobody would have thought to write down, finding the system that everything secretly depends on. That work is real and it is worth paying for.',
      },
      {
        type: 'p',
        text: 'The problem is the ratio and the output. Those things take about a week. The remaining five weeks are spent converting that understanding into a document whose primary function is to make a decision feel de-risked without actually de-risking it.',
      },
      { type: 'h2', text: 'Build the thing most likely to be wrong' },
      {
        type: 'p',
        text: 'Every project has one assumption that, if false, invalidates everything else. That the data contains enough signal. That the third-party API can sustain the throughput. That the legacy schema can be read without taking the database down. That users will accept the workflow at all.',
      },
      {
        type: 'p',
        text: 'The alternative to discovery is to find that assumption in week one and attack it in weeks two and three — in the real environment, against real data, with a result that is unambiguously true or false. Not a prototype that demonstrates a happy path. A test designed to fail if the premise is bad.',
      },
      {
        type: 'defs',
        items: [
          {
            term: 'Week one · Interrogate',
            description:
              'Learn the domain, meet the stakeholders, map the constraints, and — most importantly — write down what would have to be true for this project to be worth doing.',
          },
          {
            term: 'Weeks two and three · Prove',
            description:
              'Build the smallest thing that resolves the riskiest assumption, in the client’s environment, with the client’s data. Publish the result even when it is inconvenient.',
          },
          {
            term: 'The fork',
            description:
              'If the assumption holds, the engagement continues with the riskiest unknown already retired. If it does not, the client has spent three weeks instead of six months, and the plan changes while changing it is still cheap.',
          },
        ],
      },
      {
        type: 'quote',
        text: 'Kill criteria written before the work starts are the strongest signal a studio can give that it is optimising for your outcome and not for its own utilisation.',
      },
      { type: 'h2', text: 'The uncomfortable clause' },
      {
        type: 'p',
        text: 'We write kill criteria into statements of work. A specific, measurable condition that ends the engagement early with the remainder refunded. It is uncomfortable to propose and it costs us revenue in the cases where it triggers.',
      },
      {
        type: 'p',
        text: 'It is also the fastest way to establish that the advice is honest. A studio with a kill clause has no incentive to keep a doomed project alive, which means the assessment in week three can be trusted — and being trusted in week three is worth considerably more than the fees from a project that should have stopped.',
      },
      {
        type: 'p',
        text: 'The objection is obvious: what if the client wants the certainty a discovery document provides? The answer is that they want certainty, and a document does not contain any. A working spike against production data does. Given the choice between those two artefacts, no technical stakeholder has ever chosen the document — and no non-technical stakeholder has ever regretted the spike.',
      },
      {
        type: 'note',
        label: 'How we sell it',
        text: 'The first three weeks of any engagement are priced as a standalone piece of work with a defined output and an explicit exit. If we are wrong about the approach, that is where you find out — for the cost of three weeks rather than the cost of a quarter.',
      },
    ],
  },
];

export function getEssay(slug: string): Essay | undefined {
  return essays.find((essay) => essay.slug === slug);
}
