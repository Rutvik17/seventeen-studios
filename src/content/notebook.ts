import type { Block } from './types';

/**
 * The notebook — lessons, not blog posts.
 *
 * ---
 *
 * WHAT THESE ARE
 *
 * Each one teaches you to build a thing this studio built, from nothing, and
 * you should be able to do it yourself at the end. Not a write-up. Not "here is
 * what I made and why it was hard". A lesson, with the maths and the physics
 * and the code that actually produced the result.
 *
 * The product argument behind that: an AI agent can produce a working artefact
 * from a prompt far faster than a person can type one. What it cannot do is
 * leave the person understanding it. Understanding is the thing worth having
 * and the thing worth publishing, so these are written to transfer it rather
 * than to display it.
 *
 * ---
 *
 * THE RULES, WHICH ARE GRASP'S
 *
 * 1. **Assume no prior knowledge at all.** Not "rusty" — none. Read it back as
 *    someone who does not know what a volt or a derivative is, and find the
 *    first word they would have had to look up.
 * 2. **Every symbol is introduced before it is used.** The `equation` block
 *    type enforces this: `words` and `where` are required fields, so a symbolic
 *    form cannot be authored without an English sentence and a named list of
 *    every symbol in it.
 * 3. **Show the arithmetic with real numbers in it.** Never a bare result.
 * 4. **The reader must be able to rebuild it.** If a step cannot be followed to
 *    a working result, it is not finished — however well it reads.
 * 5. **No filler.** The standard failure of technical writing is a thousand
 *    words of preamble before the first useful sentence. Start at the thing.
 * 6. **If it can be operated, operate it.** An embedded instrument teaches more
 *    in four seconds of dragging than six paragraphs, and the reader believes
 *    it because they moved it themselves.
 */

/**
 * Subjects a lesson can be filed under.
 *
 * A closed union rather than free strings, so a typo becomes a type error
 * instead of a tag page with one entry on it that nobody can find.
 */
export type Tag =
  | 'hardware'
  | 'electronics'
  | 'quantitative'
  | 'machine-learning'
  | 'physics'
  | 'mathematics'
  | 'graphics'
  | 'teaching';

export const TAGS: { id: Tag; label: string; blurb: string }[] = [
  { id: 'hardware', label: 'Hardware', blurb: 'Boards, parts, power budgets' },
  { id: 'electronics', label: 'Electronics', blurb: 'Circuits from first principles' },
  { id: 'quantitative', label: 'Quantitative', blurb: 'Risk, simulation, money' },
  { id: 'machine-learning', label: 'Machine learning', blurb: 'Models that are actually fitted' },
  { id: 'physics', label: 'Physics', blurb: 'Forces, motion, simulation' },
  { id: 'mathematics', label: 'Mathematics', blurb: 'The maths under the surface' },
  { id: 'graphics', label: 'Graphics', blurb: 'Drawing with code' },
  { id: 'teaching', label: 'Teaching', blurb: 'How understanding is built' },
];

export const tagLabel = (id: Tag): string =>
  TAGS.find((t) => t.id === id)?.label ?? id;

export type Entry = {
  slug: string;
  index: string;
  title: string;
  /** One line, on the index row. */
  standfirst: string;
  /** The subject, for the row's pill. */
  topic: string;
  /** Subjects this lesson is filed under. The first is its primary. */
  tags: Tag[];
  /**
   * What a reader can do at the end that they could not at the start.
   *
   * Required, and the most useful field in this file. A lesson that cannot
   * state one has not decided what it is teaching — and the exercise of writing
   * it catches an entry that is really a write-up wearing a lesson's clothes.
   */
  outcome: string;
  /** What they need first. Empty means genuinely nothing. */
  prerequisites: string[];
  /** ISO date the entry was published. A fact, so it stays literal. */
  date: string;
  /** The wash this row brings to the index page. */
  color: string;
  ink: string;
  blocks: Block[];
};

export const entries: Entry[] = [
  /* ------------------------------------------------------------------ */
  {
    slug: 'designing-a-circuit-board',
    index: '01',
    title: 'Designing a circuit board',
    standfirst:
      'What every part on a circuit board is for, and how to size the two things that decide whether it works: trace width, and the battery behind a duty cycle.',
    topic: 'Hardware',
    tags: ['hardware', 'electronics'],
    outcome:
      'Read a circuit board, work out how wide a wire has to be, and size a battery for a device that sleeps.',
    prerequisites: ['None. It starts at what a circuit board is.'],
    date: '2026-08-22',
    color: '#d3e3da',
    ink: '#123f33',
    blocks: [
      {
        type: 'p',
        text: 'The problem: show one figure on a device that sits on a shelf, is read at a glance, and runs for months on a single cell. Three constraints follow immediately. The display cannot be lit, because a backlight is the largest load in the budget. It has to hold its image with the power off, because the processor will be asleep almost all of the time. And the processor has to wake on a schedule it is not itself counting.',
      },
      {
        type: 'p',
        text: 'What follows is a board that meets those constraints, component by component, starting from the bare laminate. No prior electronics is assumed.',
      },

      { type: 'h2', text: 'What a circuit board actually is' },
      {
        type: 'p',
        text: 'A circuit board is wires made flat. That is the whole idea. Instead of running loose wire between parts, you glue a thin sheet of copper onto a stiff board, dissolve away everything except the lines you want, and you are left with wires that cannot move, cannot tangle, and cost the same whether you make one or ten thousand.',
      },
      {
        type: 'term',
        word: 'FR-4',
        plain:
          'The stiff board underneath — woven glass cloth set in resin. It is the same material as the green boards inside every appliance you own, and 1.6 mm thick is the standard because that is what fits the connectors everyone already makes.',
      },
      {
        type: 'p',
        text: 'The green colour is a lacquer called soldermask, painted over the copper everywhere except where a part needs to be attached. It stops the copper corroding and stops molten metal bridging two lines that should not touch.',
      },

      { type: 'h2', text: 'The parts, and what each one is for' },
      {
        type: 'p',
        text: 'Turn the board with your pointer and click anything on it. Every component gets a plain answer to three questions: what it is, what it does here, and what would break without it.',
      },
      { type: 'embed', component: 'board3d', caption: 'Drag to turn · click any part' },
      {
        type: 'p',
        text: 'Fourteen parts. One of them thinks; the rest either feed it, time it, or are told what to do. That ratio is normal — most of a board exists to keep one chip alive and honest.',
      },

      { type: 'h2', text: 'Regulating the supply voltage' },
      {
        type: 'term',
        word: 'Volt',
        plain:
          'A measure of electrical push. Higher voltage pushes harder. A USB charger pushes at 5 volts; the computer on this board is built for 3.3 and is destroyed, permanently and instantly, by 5.',
      },
      {
        type: 'p',
        text: 'So the very first thing on the board after the socket is a part whose only job is to push less hard. It takes 5 volts in and lets 3.3 volts out, and it does that by turning the difference into heat. Nothing clever, and absolutely required.',
      },
      {
        type: 'note',
        label: 'The part everyone forgets',
        text: 'A USB-C socket will not give you any power at all until the device identifies itself, and it does that with two ordinary resistors. Leave them off and a perfectly good board is simply dead when you plug it in — no light, no warmth, no clue. It is the most common first-board mistake there is.',
      },

      { type: 'h2', text: 'Trace width, from the IPC-2221A standard' },
      {
        type: 'p',
        text: 'A wire carrying electricity warms up. Too thin and it warms a lot; thin enough and it behaves like the element in a toaster. So there is a real question with a real answer: given how much current this line has to carry, how wide does the copper need to be?',
      },
      {
        type: 'term',
        word: 'Amp',
        plain:
          'A measure of how much electricity is flowing — the quantity, where volts are the push. A phone charger supplies one or two amps. This whole board averages about a thousandth of one.',
      },
      {
        type: 'p',
        text: 'The electronics industry answers this with a standard called IPC-2221, and it works in two steps. First, how much copper cross-section do you need? Then, given how thick your copper sheet is, how wide does that make the line?',
      },
      {
        type: 'equation',
        words:
          'The cross-section needed grows with the current, and shrinks the more warming you are willing to tolerate.',
        symbols: 'A = ( I ÷ ( k × ΔT^b ) )^(1÷c)',
        where: [
          { symbol: 'A', means: 'the cross-section of copper needed, in square thousandths of an inch' },
          { symbol: 'I', means: 'the current the wire must carry, in amps' },
          { symbol: 'ΔT', means: 'how much hotter than the surrounding air you will let the wire get, in degrees Celsius' },
          { symbol: 'k, b, c', means: 'constants measured by experiment. `k` is 0.048 for a wire on the surface and 0.024 for one buried inside the board — buried copper has no air to shed heat into' },
        ],
        substituted: 'A = ( 0.5 ÷ ( 0.048 × 10^0.44 ) )^(1÷0.725)',
        result: '6.26',
        soWhat:
          'Half an amp, on the surface, warming by no more than ten degrees, needs about six and a quarter square thousandths of an inch of copper.',
      },
      {
        type: 'equation',
        words:
          'Spread that cross-section over however thick your copper sheet is, and what is left over is the width.',
        symbols: 'w = A ÷ ( t × 1.378 )',
        where: [
          { symbol: 'w', means: 'the width of the line, in thousandths of an inch' },
          { symbol: 'A', means: 'the cross-section from the step above' },
          { symbol: 't', means: 'the copper weight in ounces — the industry sells it by weight per square foot rather than by thickness' },
          { symbol: '1.378', means: 'how many thousandths of an inch thick one ounce per square foot works out to be' },
        ],
        substituted: 'w = 6.26 ÷ ( 1 × 1.378 )',
        result: '4.55 thousandths of an inch, or 0.116 mm',
        soWhat:
          'About a tenth of a millimetre — narrower than a human hair is wide. That is the *minimum*, not the target.',
      },
      {
        type: 'p',
        text: 'Move the sliders. The thing worth noticing is not any single answer but the shape of it: double the current and the width does not double, it roughly triples. That exponent of one-over-0.725 is where that comes from, and no sentence explains it as well as ten seconds of dragging.',
      },
      { type: 'embed', component: 'trace-width', caption: 'The real IPC-2221A calculation' },
      {
        type: 'note',
        label: 'Why the corners are never square',
        text: 'Look at any trace on the board: it turns at 45 degrees, never at a right angle. That is not styling. The board is made by dissolving unwanted copper away in acid, and a sharp inside corner holds the acid against the metal for longer than the flat runs — so the corner over-etches and the wire ends up thinnest exactly where it turns. Every board manufacturer forbids right angles for this reason.',
      },

      { type: 'h2', text: 'The crystal that keeps time' },
      {
        type: 'p',
        text: 'It does not. A processor has no sense of time at all; it only knows how to count. To sleep for ten minutes and wake up, it needs something outside itself that ticks at a rate nobody has to guess.',
      },
      {
        type: 'p',
        text: 'That is the crystal — a sliver of quartz a little over three millimetres long. Squeeze quartz and it produces a small voltage; apply a voltage and it flexes. Wire that up so each flex triggers the next and it will vibrate, at a rate set by the size of the slice and almost nothing else. Not by temperature, not by how old it is, not by the weather.',
      },
      {
        type: 'term',
        word: '32,768',
        plain:
          'The number of times per second this crystal vibrates. It looks arbitrary and is not: it is 2 multiplied by itself fifteen times. A counter that halves the rate fifteen times over — which is the simplest circuit there is — turns it into exactly one tick per second. Every quartz watch in the world uses this same number for this same reason.',
      },
      {
        type: 'p',
        text: 'A crystal on its own runs slightly fast, because the circuit around it adds a small electrical load the crystal was not cut for. The fix is two capacitors — components that hold a tiny amount of charge — one on each leg, chosen to make up the difference.',
      },
      {
        type: 'equation',
        words:
          'The two capacitors, plus the stray capacitance that the pads and tracks bring with them, have to add up to the load the crystal was designed for.',
        symbols: 'C_L = ( C1 × C2 ) ÷ ( C1 + C2 ) + C_stray',
        where: [
          { symbol: 'C_L', means: 'the load the crystal needs, printed on its datasheet — 12.5 pF here' },
          { symbol: 'C1, C2', means: 'the two capacitors you add, one on each leg' },
          { symbol: 'C_stray', means: 'capacitance you get for free whether you want it or not, from the copper pads and the tracks. About 3 pF' },
          { symbol: 'pF', means: 'a picofarad — a millionth of a millionth of a farad. These are genuinely tiny quantities of charge' },
        ],
        substituted: 'with C1 = C2, this rearranges to C1 = 2 × ( 12.5 − 3 )',
        result: '19 pF',
        soWhat:
          'And you cannot buy a 19 pF capacitor. They are made in a fixed series of values, so you fit 18 pF — the nearest one that exists — and accept the result.',
      },
      {
        type: 'p',
        text: 'Fitting 18 pF gives a load of 12.0 pF against the 12.5 the crystal wanted. That half-picofarad of error is real and it makes the clock run very slightly fast. This is what electronics is actually like: the formula gives you a number, the shop does not sell that number, and part of the job is knowing which errors you can live with.',
      },

      { type: 'h2', text: 'E-ink: an image that survives the power going off' },
      {
        type: 'p',
        text: 'The display is electronic paper. Instead of lighting pixels up, it moves specks of black and white pigment through a clear fluid using an electric field. Once they have moved they stay put — with the power off, for years. It only draws current while the picture is changing.',
      },
      {
        type: 'p',
        text: 'That is the whole reason this device can run for weeks on a small battery. A backlit screen spends its energy holding a picture; this one spends nothing until the picture is wrong.',
      },
      {
        type: 'note',
        label: 'The trade, stated honestly',
        text: 'It is slow. A full refresh on a three-colour panel takes about fifteen seconds, because the red pigment needs a long repeated shove to move at all — and it flashes black and white several times while it works. That rules out anything interactive and rules in exactly this: a thing that changes a few times an hour and is readable in direct sunlight.',
      },

      { type: 'h2', text: 'The power budget, and battery life' },
      {
        type: 'p',
        text: 'Battery life comes down to one honest sum, and the trap in it catches almost everybody the first time.',
      },
      {
        type: 'p',
        text: 'The radio pulls about 240 milliamps while it is transmitting — a lot. Deep asleep, the whole board draws 0.043 milliamps — almost nothing. The mistake is to size the battery off the big number. What actually matters is the average, because the radio is only on for about a third of one percent of the time.',
      },
      {
        type: 'equation',
        words:
          'The average draw is each mode’s current multiplied by the fraction of time spent in it, all added together.',
        symbols: 'I_avg = Σ ( I_mode × t_mode )',
        where: [
          { symbol: 'I_avg', means: 'the average current, in milliamps' },
          { symbol: 'Σ', means: 'a Greek capital sigma — it just means "add all of these up"' },
          { symbol: 'I_mode', means: 'the current drawn in one mode, such as asleep or transmitting' },
          { symbol: 't_mode', means: 'the fraction of time spent in that mode, between 0 and 1' },
        ],
        substituted:
          '( 0.043 × 0.9945 ) + ( 240 × 0.0035 ) + ( 26 × 0.002 )',
        result: '0.93 milliamps',
        soWhat:
          'The 240 mA radio contributes 0.84 of that — most of the total, from 0.35% of the time. Rare and enormous still wins over constant and tiny.',
      },
      {
        type: 'equation',
        words:
          'Battery life is the capacity divided by the average draw — after knocking off some capacity you will never actually get to use.',
        symbols: 'days = ( capacity × 0.85 ) ÷ I_avg ÷ 24',
        where: [
          { symbol: 'capacity', means: 'the battery’s rating in milliamp-hours — 1200 mAh means it can supply 1200 milliamps for one hour, or 1 milliamp for 1200 hours' },
          { symbol: '0.85', means: 'a derate. A battery cannot be run flat: the voltage sags below what the regulator needs while there is still charge left, and the battery leaks a little on its own' },
          { symbol: '÷ 24', means: 'hours into days' },
        ],
        substituted: '( 1200 × 0.85 ) ÷ 0.93 ÷ 24',
        result: 'about 45 days',
        soWhat:
          'Drop the 0.85 and you would claim 54 days. That is how most quoted battery lives get to be about a fifth too generous.',
      },

      { type: 'h2', text: 'Why the display shows a face' },
      {
        type: 'p',
        text: 'The screen could show a number. It shows a face instead, because a face is readable from across a room and a number is not. You do not read it — you catch it, the way you catch someone’s expression before you have heard a word.',
      },
      {
        type: 'p',
        text: 'The interesting problem is what the face should react to. Reacting to a percentage is wrong: a 3% move is an ordinary Tuesday for a volatile stock and a significant event for a stable one, so a fixed threshold would leave the thing permanently alarmed about one and asleep through the other.',
      },
      {
        type: 'p',
        text: 'So it reacts to how *unusual* the move is for that particular stock, measured against how much that stock normally moves in a day. Same expression, different trigger point per asset — which is the same idea a risk desk uses, and the subject of the next entry.',
      },
      { type: 'h2', text: 'Build it yourself' },
      {
        type: 'p',
        text: 'You do not need a board fabricated to build this. Every part below exists as a breakout you can wire on a breadboard for about forty dollars, and the firmware is the same either way.',
      },
      {
        type: 'defs',
        items: [
          { term: 'ESP32-C3 dev board', description: 'Any of them. It has the module, the regulator, the USB socket and the button already on it — the first four things this lesson designed.' },
          { term: '4.01in seven-colour e-paper', description: 'Waveshare make the common one, 640 x 400, with a driver board that speaks SPI.' },
          { term: 'Six jumper wires', description: 'Power, ground, and the four display signals.' },
        ],
      },
      {
        type: 'p',
        text: 'Wire it, then flash this. It connects, fetches a price, decides a face and sleeps — the whole loop in the order the board was designed around.',
      },
      {
        type: 'code',
        language: 'cpp',
        code: [
          '#include <WiFi.h>',
          '#include <HTTPClient.h>',
          '',
          '// Wake, work, sleep. Everything about the power budget is this shape:',
          '// the radio is the expensive part, so it is on for as little as possible.',
          'const uint64_t SLEEP_MINUTES = 30;',
          '',
          'void setup() {',
          '  WiFi.begin(SSID, PASSWORD);',
          '  while (WiFi.status() != WL_CONNECTED) delay(200);',
          '',
          '  HTTPClient http;',
          '  http.begin(QUOTE_URL);',
          '  if (http.GET() == 200) {',
          '    float change = parseChange(http.getString());',
          '    drawPanel(change);          // ~15 s, then it holds with no power',
          '  }',
          '  http.end();',
          '  WiFi.disconnect(true);        // radio OFF before sleeping, or it',
          '  WiFi.mode(WIFI_OFF);          // keeps drawing tens of milliamps',
          '',
          '  esp_sleep_enable_timer_wakeup(SLEEP_MINUTES * 60ULL * 1000000ULL);',
          '  esp_deep_sleep_start();       // never returns; setup() runs again on wake',
          '}',
          '',
          'void loop() {}                  // unreachable — deep sleep restarts the chip',
        ].join('\n'),
      },
      {
        type: 'note',
        label: 'The line that decides your battery life',
        text: 'Turning the radio off before sleeping. Leave it up and the board draws tens of milliamps instead of forty microamps — a thousand times more — and the forty-five days in this lesson becomes about an hour. Every figure in the power budget above assumes those two lines are there.',
      },
      {
        type: 'p',
        text: 'Once it works on a breadboard, the board in this lesson is the same circuit with the jumper wires replaced by copper. That is genuinely the only difference, and it is why prototyping first is worth the forty dollars: a mistake costs a rewire rather than a fabrication run.',
      },
      {
        type: 'note',
        label: 'Where it is up to',
        text: 'The board is designed, not fabricated. Everything above is real: real packages, real footprints, real calculations. What has not happened yet is sending it to a manufacturer and finding out which of my assumptions were wrong — and that is genuinely the most useful part, which is why it will get its own entry when it happens.',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: 'monte-carlo-simulation',
    index: '02',
    title: 'Monte Carlo simulation',
    standfirst:
      'Estimating a probability by simulation when the closed form is intractable — from a coin flip to value at risk across six correlated assets.',
    topic: 'Quantitative',
    tags: ['quantitative', 'mathematics'],
    outcome:
      'Answer a probability question by simulating it, and know when the answer you get is worth trusting.',
    prerequisites: ['Arithmetic. Nothing else.'],
    date: '2026-08-22',
    color: '#f7e4c8',
    ink: '#7a4410',
    blocks: [
      {
        type: 'p',
        text: 'There are two ways to answer a question about chance. You can solve it — sit down with algebra and derive the exact answer. Or you can simulate it: play the situation out a great many times and count what happened.',
      },
      {
        type: 'p',
        text: 'The second is not an approximation of the first. For most problems worth asking it is the only method available, because the closed form either does not exist or cannot be derived in the time you have. It has a name.',
      },
      {
        type: 'term',
        word: 'Monte Carlo',
        plain:
          'Answering a question by running a random experiment thousands of times and counting the outcomes. Named after the casino, by the physicists who invented it in the 1940s while working on nuclear weapons and finding the equations unsolvable.',
      },

      { type: 'h2', text: 'Start with a coin' },
      {
        type: 'p',
        text: 'Flip a fair coin ten times. What is the chance of getting exactly seven heads? There is an exact answer and you can look up the formula. Or you can flip ten coins, write down the count, and do that a hundred thousand times. About 11,700 of those runs come out at seven — so the answer is about 11.7%.',
      },
      {
        type: 'p',
        text: 'The exact answer is 11.71875%. The simulation got there without anyone knowing the formula existed. That is the whole trick, and everything below is that same trick applied to something where the formula is genuinely hard.',
      },

      { type: 'h2', text: 'From coin flips to value at risk' },
      {
        type: 'p',
        text: 'Here is a question a bank has to answer every day: how much could this portfolio lose over the next three months? Not on average — on a bad day. Specifically, the size of loss that only gets exceeded 5% of the time.',
      },
      {
        type: 'term',
        word: 'Value at risk',
        plain:
          'The loss you would exceed only on the worst small fraction of days. "95% one-month value at risk of $40,000" means: in a normal month you lose less than $40,000, and one month in twenty you lose more.',
      },
      {
        type: 'p',
        text: 'So: make up a plausible three months, thousands of times over, and look at where the bad ones land. To do that you need a rule for how a price wanders.',
      },
      {
        type: 'equation',
        words:
          'A price drifts upward over time at a steady rate, and is knocked around that drift by randomness whose size depends on how jumpy the asset is.',
        symbols: 'S_T = S_0 × e^( (μ − σ²÷2) × T + σ × √T × Z )',
        where: [
          { symbol: 'S_0', means: 'the price today' },
          { symbol: 'S_T', means: 'the price at the end, after time T' },
          { symbol: 'μ', means: 'the Greek letter mu — the average yearly return you expect' },
          { symbol: 'σ', means: 'the Greek letter sigma — volatility, meaning how much this asset typically swings about in a year. A σ of 0.45 means roughly 45% swings' },
          { symbol: 'T', means: 'time, in years. Three months is 0.25' },
          { symbol: 'Z', means: 'the random part: a draw from the bell curve, averaging zero. This is the only thing that changes between runs' },
          { symbol: 'e', means: 'the number 2.718…, which turns up whenever something grows by a percentage of itself — here, because money compounds' },
        ],
        soWhat:
          'Run that line fifty thousand times with a fresh Z each time and you have fifty thousand plausible futures. Sort them, look 5% of the way up from the bottom, and that is your value at risk.',
      },
      {
        type: 'note',
        label: 'The one term everyone drops',
        text: 'That −σ²÷2 in the exponent looks like a correction nobody would miss. Leave it out and the simulated average drifts upward as volatility rises — so a *riskier* portfolio starts looking more profitable, which inverts the entire result. It is one symbol, and it is why the panel below prints its disagreement with the exact answer: the check catches it instantly.',
      },

      { type: 'h2', text: 'Running the simulation' },
      {
        type: 'p',
        text: 'Real prices, fetched when this page was built. Move anything and fifty thousand futures are redrawn in your browser.',
      },
      { type: 'embed', component: 'risk', caption: 'Live Monte Carlo — move the inputs' },
      {
        type: 'p',
        text: 'The column labelled "simulation vs formula" is the important one. An approximate closed-form answer exists, so the panel computes both and shows the gap. A simulation that lands within a fraction of a percent of the formula is a claim you can check rather than one you have to take.',
      },

      { type: 'h2', text: 'Six assets, and the correlation between them' },
      {
        type: 'p',
        text: 'That panel is not simulating one company. It is simulating six, together, and that changes the problem in a way worth understanding — because it is the only thing in investing that reliably gives you something for nothing.',
      },
      {
        type: 'p',
        text: 'Suppose you own two companies, each of which swings about 50% in a year. If they always rose and fell on the same days, owning both would be exactly as bumpy as owning either. You would have spread your money and gained nothing.',
      },
      {
        type: 'p',
        text: 'They do not. On a day one falls, the other sometimes rises, and the two partly cancel. The combined swing comes out smaller than either — without predicting anything, without timing anything, and without giving up any of the expected return.',
      },
      {
        type: 'term',
        word: 'Correlation',
        plain:
          'A number between −1 and +1 for how much two things move together. +1 means always in step. 0 means knowing one tells you nothing about the other. −1 means perfectly opposed. Measured from the real prices, Amazon and Alphabet sit at about 0.56 — the closest pair here — and Rocket Lab and Alphabet at about 0.24, the furthest apart.',
      },
      {
        type: 'equation',
        words:
          'A portfolio’s swing is the square root of every pair of holdings multiplied together, weighted by how much of each you own and by how closely that pair moves.',
        symbols: 'σ_p = √( Σᵢ Σⱼ  wᵢ wⱼ ρᵢⱼ σᵢ σⱼ )',
        where: [
          { symbol: 'σ_p', means: 'the portfolio’s volatility — how much the whole thing swings in a year' },
          { symbol: 'wᵢ', means: 'the share of your money in holding i, so all the w add up to 1' },
          { symbol: 'σᵢ', means: 'how much holding i swings on its own' },
          { symbol: 'ρᵢⱼ', means: 'the correlation between holdings i and j — the Greek letter rho' },
          { symbol: 'Σᵢ Σⱼ', means: 'add up over every pair, including each holding paired with itself' },
        ],
        soWhat:
          'Set every ρ to 1 and this collapses to the plain weighted average of the individual swings. Every correlation below 1 shrinks a term, so the real answer always comes out lower. That gap is diversification, and it is arithmetic rather than opinion.',
      },
      {
        type: 'p',
        text: 'For the six names on the panel, held in equal amounts, the average of their individual swings is about 51%. The portfolio actually swings about 36%. Fifteen percentage points of turbulence removed, for free.',
      },
      {
        type: 'note',
        label: 'The catch, and it is a serious one',
        text: 'Correlations are not constant. In a crash almost everything falls together and the numbers rush toward 1 — which means diversification is weakest exactly on the days you would most want it. Every model that treats correlation as fixed, including the one on this page, understates how bad a genuinely bad month can be. That is not a small caveat; it is most of what went wrong in 2008.',
      },
      { type: 'h2', text: 'Build it yourself' },
      {
        type: 'p',
        text: 'Everything above is about fifty lines. Paste them into any file that runs JavaScript — a browser console will do — and you have a working Monte Carlo.',
      },
      {
        type: 'p',
        text: 'Step one: you need random numbers shaped like a bell curve, and the language only gives you flat ones between 0 and 1. The Box–Muller transform converts a pair of flat numbers into a pair of bell-curve ones.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          '// A stream of standard normal draws: average 0, spread 1.',
          '// Two flat random numbers go in, two bell-curve numbers come out,',
          '// so the second is kept rather than thrown away.',
          'function normals() {',
          '  let spare = null;',
          '  return function draw() {',
          '    if (spare !== null) { const v = spare; spare = null; return v; }',
          '    let u, v, s;',
          '    do {',
          '      u = Math.random() * 2 - 1;',
          '      v = Math.random() * 2 - 1;',
          '      s = u * u + v * v;',
          '    } while (s >= 1 || s === 0);   // reject points outside the unit circle',
          '    const f = Math.sqrt(-2 * Math.log(s) / s);',
          '    spare = v * f;',
          '    return u * f;',
          '  };',
          '}',
        ].join('\n'),
      },
      {
        type: 'p',
        text: 'Step two: one simulated future. This is the formula from earlier, written out. Note the minus sigma-squared over two — that is the term everyone drops.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          'function terminalValue(start, drift, vol, years, z) {',
          '  const growth = (drift - (vol * vol) / 2) * years;  // the Ito correction',
          '  const shock = vol * Math.sqrt(years) * z;',
          '  return start * Math.exp(growth + shock);',
          '}',
        ].join('\n'),
      },
      {
        type: 'p',
        text: 'Step three: run it fifty thousand times, sort the results, and read the answer off the sorted list.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          'function valueAtRisk(opts) {',
          '  const { start, drift, vol, years, alpha, paths } = opts;',
          '  const draw = normals();',
          '',
          '  const outcomes = new Float64Array(paths);',
          '  for (let i = 0; i < paths; i++) {',
          '    outcomes[i] = terminalValue(start, drift, vol, years, draw());',
          '  }',
          '  outcomes.sort();   // a typed array sorts numerically by default',
          '',
          '  // The loss you exceed only alpha of the time is the value sitting',
          '  // alpha of the way up the sorted list.',
          '  const index = Math.floor(alpha * paths);',
          '  const worstCase = outcomes[index];',
          '',
          '  // Expected shortfall: the average of everything at or below it.',
          '  let tail = 0;',
          '  for (let i = 0; i <= index; i++) tail += outcomes[i];',
          '',
          '  return {',
          '    valueAtRisk: start - worstCase,',
          '    expectedShortfall: start - tail / (index + 1),',
          '    median: outcomes[Math.floor(paths / 2)],',
          '  };',
          '}',
          '',
          'valueAtRisk({',
          '  start: 1000000, drift: 0.07, vol: 0.36,',
          '  years: 0.25, alpha: 0.05, paths: 50000,',
          '});',
        ].join('\n'),
      },
      {
        type: 'p',
        text: 'That is the whole thing. On a three-month horizon at 36% volatility it returns a value at risk near $255,000 — and because it is a simulation rather than a formula, you can change the model without changing anything else.',
      },
      {
        type: 'h3', text: 'Checking the simulation against the closed form',
      },
      {
        type: 'p',
        text: 'A simulation gives an answer whether or not the code is right, which is exactly what makes it dangerous. For this particular model an exact answer exists, so compare them.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          '// The exact 5% quantile of the same distribution.',
          '// -1.6449 is the point on the bell curve with 5% below it.',
          'function exactVaR(start, drift, vol, years, z05) {',
          '  const growth = (drift - (vol * vol) / 2) * years;',
          '  return start - start * Math.exp(growth + vol * Math.sqrt(years) * z05);',
          '}',
          '',
          '// Run both. They should agree to a fraction of a percent.',
          '// If they do not, the bug is in your simulation, not in the maths.',
        ].join('\n'),
      },
      {
        type: 'note',
        label: 'Try breaking it on purpose',
        text: 'Delete the minus sigma-squared over two from `terminalValue` and run both again. The simulation will drift above the exact answer, and the gap grows as you raise the volatility — a riskier portfolio starts looking more profitable. That is one symbol, it inverts the result, and the check catches it in seconds. Put the term back.',
      },
      {
        type: 'note',
        label: 'What this model gets wrong',
        text: 'It assumes volatility is constant and that returns follow a bell curve. Real markets do neither — calm and violent periods clump together, and genuinely extreme days happen far more often than a bell curve allows. So a true one-in-twenty day is worse than this shows. The fix is to draw Z from a fatter-tailed distribution, which is a change to one function; the machinery around it is unchanged. That is the real argument for simulation over algebra — swap the assumption and everything downstream still works.',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: 'physics-based-animation',
    index: '03',
    title: 'Physics-based animation',
    standfirst:
      'Integrating forces instead of sampling curves: a spring, a driven pendulum, two-bone inverse kinematics, and a Verlet chain.',
    topic: 'Motion',
    tags: ['physics', 'graphics'],
    outcome:
      'Animate anything with forces instead of curves, and write a spring integrator that does not explode.',
    prerequisites: ['Being able to read a few lines of code helps, but the maths is explained from scratch.'],
    date: '2026-08-22',
    color: '#f8dde1',
    ink: '#8f2338',
    blocks: [
      {
        type: 'p',
        text: 'Most motion on the web is interpolation along a curve: "move from here to there over 300 milliseconds, easing out". It is cheap, it is one line, and it does not behave the way a physical object behaves.',
      },
      {
        type: 'p',
        text: 'Here is the tell. Interrupt it. Start the animation, and halfway through, change your mind and send it somewhere else. A curve restarts from wherever it happens to be, at zero speed, as though the first movement never happened. Nothing physical does that.',
      },

      { type: 'h2', text: 'What a spring does instead' },
      {
        type: 'p',
        text: 'A real object has momentum. Interrupt it while it is moving fast and it overshoots the new target; interrupt it while it is barely moving and it eases across. Same instruction, different outcome, decided by what it was already doing.',
      },
      {
        type: 'p',
        text: 'You get that for free by simulating instead of interpolating — by not asking where the thing should be, and instead asking what forces act on it and letting position fall out.',
      },
      {
        type: 'equation',
        words:
          'A spring pulls toward its target in proportion to how far away it is, and is slowed by something proportional to how fast it is going.',
        symbols: 'F = −k × ( x − target ) − c × v',
        where: [
          { symbol: 'F', means: 'the force on the object right now' },
          { symbol: 'k', means: 'stiffness — how hard the spring pulls. Higher is snappier' },
          { symbol: 'x', means: 'where the object is at this instant' },
          { symbol: 'v', means: 'how fast it is moving at this instant' },
          { symbol: 'c', means: 'damping — resistance that grows with speed, like moving through syrup. Without it, nothing ever stops' },
          { symbol: '−', means: 'both terms are negative because both oppose: the pull is back toward the target, the drag is against the motion' },
        ],
        soWhat:
          'There is no destination and no duration anywhere in that line. The object simply has a force on it, and where it goes is the consequence.',
      },
      {
        type: 'p',
        text: 'Each frame: work out the force, use it to change the speed, use the speed to change the position. Three lines. The order of the last two matters more than it looks.',
      },
      {
        type: 'code',
        language: 'typescript',
        code: `step(dt: number) {
  const force = -this.stiffness * (this.value - this.target)
              -   this.damping * this.velocity;
  this.velocity += (force / this.mass) * dt;   // speed first
  this.value    += this.velocity * dt;         // then position, from the NEW speed
}`,
      },
      {
        type: 'note',
        label: 'The line that decides whether it works',
        text: 'Update the position from the OLD speed instead of the new one and the maths quietly adds a little energy on every step. A lightly damped spring then winds itself up until it flies off the screen. Same three lines, one swapped, and the difference between a stable simulation and one that explodes after four seconds. This is the whole content of "semi-implicit Euler", a phrase that sounds far more intimidating than the swap it describes.',
      },

      { type: 'h2', text: 'Inverse kinematics: solving for the elbow' },
      {
        type: 'p',
        text: 'The character below has arms that bend at an elbow. Nothing anywhere animates an arm. A pose moves the *hand’s target*; a spring takes its own path toward it; and the elbow is then worked out from wherever the hand actually got to this frame.',
      },
      {
        type: 'term',
        word: 'Inverse kinematics',
        plain:
          'Working backwards. Normally you set the joint angles and see where the hand lands. Inverse kinematics is the other direction: you say where the hand should be and solve for the angles that put it there.',
      },
      {
        type: 'p',
        text: 'With exactly two bones there is a closed-form answer — the law of cosines gives you the elbow directly, in one step, exactly. Iterative solvers exist for longer chains and are strictly worse here: they converge over several passes and jitter near full stretch, and both of those are visible on a character’s arm.',
      },
      { type: 'h2', text: 'Build it yourself' },
      {
        type: 'p',
        text: 'A spring is a class with three numbers and one method. Here it is complete.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          'class Spring {',
          '  constructor(value = 0, stiffness = 120, damping = 14) {',
          '    this.value = value;      // where it is',
          '    this.target = value;     // where it wants to be',
          '    this.velocity = 0;       // how fast it is going',
          '    this.stiffness = stiffness;',
          '    this.damping = damping;',
          '  }',
          '',
          '  step(dt) {',
          '    const force = -this.stiffness * (this.value - this.target)',
          '                - this.damping * this.velocity;',
          '    this.velocity += force * dt;   // speed first',
          '    this.value += this.velocity * dt;  // then position, from the NEW speed',
          '    return this.value;',
          '  }',
          '}',
        ].join('\n'),
      },
      {
        type: 'p',
        text: 'Now drive it. The only subtlety is the timestep: a browser frame is not a fixed length, and feeding a variable dt into a spring makes it behave differently on a 60Hz laptop and a 120Hz phone — and explode when a backgrounded tab returns a two-second frame.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          'const x = new Spring(0);',
          'const y = new Spring(0);',
          '',
          'window.addEventListener("pointermove", e => {',
          '  x.target = e.clientX;',
          '  y.target = e.clientY;',
          '});',
          '',
          'const FIXED = 1 / 120;   // simulate at a constant rate',
          'let accumulator = 0;',
          'let last = performance.now();',
          '',
          'function frame(now) {',
          '  // Cap the frame. A tab restored after 30 seconds must not ask for',
          '  // 30 seconds of simulation in one go.',
          '  accumulator += Math.min((now - last) / 1000, 0.25);',
          '  last = now;',
          '',
          '  while (accumulator >= FIXED) {',
          '    x.step(FIXED);',
          '    y.step(FIXED);',
          '    accumulator -= FIXED;',
          '  }',
          '',
          '  dot.style.transform = "translate(" + x.value + "px," + y.value + "px)";',
          '  requestAnimationFrame(frame);',
          '}',
          'requestAnimationFrame(frame);',
        ].join('\n'),
      },
      {
        type: 'p',
        text: 'Move the pointer fast and stop dead: the dot overshoots and settles. Move it slowly and it glides in. Same code, different behaviour, decided entirely by the velocity it was carrying — which is the thing an easing curve cannot do.',
      },
      {
        type: 'h3', text: 'The arm' },
      {
        type: 'p',
        text: 'Two bones and a hand position. The law of cosines gives the elbow directly — no iteration, no jitter.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          '// Where should the elbow be, if the shoulder is fixed and the hand',
          '// is HERE? upper and fore are the two bone lengths.',
          'function solveElbow(shoulder, hand, upper, fore, flip = false) {',
          '  const dx = hand.x - shoulder.x;',
          '  const dy = hand.y - shoulder.y;',
          '  let dist = Math.hypot(dx, dy);',
          '',
          '  // Clamp to what the arm can actually reach. Without the epsilon,',
          '  // an exactly-straight arm makes the cosine 1.0000000001 and acos',
          '  // returns NaN — the limb vanishes.',
          '  dist = Math.min(Math.max(dist, Math.abs(upper - fore) + 1e-3),',
          '                  upper + fore - 1e-3);',
          '',
          '  const base = Math.atan2(dy, dx);',
          '  const cos = (upper * upper + dist * dist - fore * fore) / (2 * upper * dist);',
          '  const angle = base + (flip ? 1 : -1) * Math.acos(Math.min(1, Math.max(-1, cos)));',
          '',
          '  return {',
          '    x: shoulder.x + Math.cos(angle) * upper,',
          '    y: shoulder.y + Math.sin(angle) * upper,',
          '  };',
          '}',
        ].join('\n'),
      },
      {
        type: 'p',
        text: 'Put the two together — a spring holding the hand position, this solving the elbow each frame — and you have the rig below. There is nothing else in it.',
      },      { type: 'embed', component: 'spring', caption: 'Move the constants — this is the live rig' },
      {
        type: 'p',
        text: 'Drag damping to zero and watch nothing ever settle. That is not a bug being demonstrated; it is what the equation says happens when you remove the only term that takes energy out.',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: 'what-a-derivative-measures',
    index: '04',
    title: 'What a derivative measures',
    standfirst:
      'What a derivative measures, read off a graph before any notation is introduced.',
    // 'Teaching' described the register rather than the subject; every entry
    // here teaches. The topic label is what a reader scans for the field.
    topic: 'Mathematics',
    tags: ['mathematics', 'teaching'],
    outcome:
      'Understand what a derivative measures, and read one off a graph without touching the notation.',
    prerequisites: ['None. It starts at what steepness is.'],
    date: '2026-08-22',
    color: '#dce5fc',
    ink: '#12379c',
    blocks: [
      {
        type: 'p',
        text: 'A derivative is a measurement. Taught symbolically it arrives as a procedure — bring the power down, subtract one from it — which can be applied correctly by someone who cannot say what the result measures.',
      },
      {
        type: 'p',
        text: 'The measurement is geometric and the notation is a later convenience, so this takes them in that order: what the number is, how to read it off a graph, and only then how it is written.',
      },

      { type: 'h2', text: 'Steepness is a number' },
      {
        type: 'p',
        text: 'Walk up a hill. At any point you can say how steep it is right there, and you can put a number on it: go forward one metre, and how much did you rise? Rise two metres over one metre forward and the steepness is 2. Rise half a metre and it is 0.5. Flat ground is 0. Going downhill is negative.',
      },
      {
        type: 'p',
        text: 'That is the entire idea. Everything else is bookkeeping.',
      },
      {
        type: 'equation',
        words: 'Steepness is how much you went up, divided by how far you went along.',
        symbols: 'slope = rise ÷ run',
        where: [
          { symbol: 'rise', means: 'the change in height between two points' },
          { symbol: 'run', means: 'the horizontal distance between the same two points' },
        ],
        substituted: '1.40 ÷ 0.50',
        result: '2.80',
        soWhat: 'For every metre forward you climb 2.8 metres. Steep.',
      },

      { type: 'h2', text: 'A curve has no single steepness' },
      {
        type: 'p',
        text: 'On a straight line the steepness is the same everywhere and one measurement does. On a curve it changes continuously — so "how steep is it" has no answer until you say *where*.',
      },
      {
        type: 'p',
        text: 'The fix is to stop asking about the curve and ask about the straight line that just touches it at that point. That line has one steepness, and we agree to call it the steepness of the curve there.',
      },
      {
        type: 'term',
        word: 'Tangent',
        plain:
          'The straight line that grazes a curve at one point, going in the same direction the curve is going right there. Lay a ruler against the inside of a bend and you have drawn one.',
      },
      {
        type: 'p',
        text: 'Drag the point below. The tangent turns with you, and the triangle shows the rise and the run being divided.',
      },
      { type: 'embed', component: 'derivative', caption: 'Drag the point along the curve' },

      { type: 'h2', text: 'The derivative is a curve of its own' },
      {
        type: 'p',
        text: 'Watch the lower panel while you drag. Every steepness you visit gets plotted. Keep going and those dots make a shape — and that shape is itself a curve.',
      },
      {
        type: 'p',
        text: 'That is the derivative: not a procedure, but *the curve of all the slopes*. Every function has one. Where it crosses zero, the original was momentarily flat — a peak or a valley. Where it is large, the original was climbing hard.',
      },
      {
        type: 'p',
        text: 'The notation comes after. It is worth learning because exams are written in it, but it is the label on the idea and not the idea, and teaching it first is why so many people bounce off.',
      },
      { type: 'h2', text: 'Build it yourself' },
      {
        type: 'p',
        text: 'Measuring a slope is three lines. You do not need algebra, and you do not need to know the derivative of anything.',
      },
      {
        type: 'p',
        text: 'Take a point a hair to the left and a hair to the right, and divide the height difference by the distance between them. That is rise over run on a very short run.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          '// The slope of any function at any point.',
          '// f is the function; x is where you want the slope.',
          'function slopeAt(f, x, h = 0.001) {',
          '  return (f(x + h) - f(x - h)) / (2 * h);',
          '}',
          '',
          'slopeAt(x => x * x, 3);          // 6      (the exact answer is 2x = 6)',
          'slopeAt(Math.sin, 0);            // 1      (cos 0 = 1)',
          'slopeAt(x => x ** 3 - 3 * x, 1); // 0      (a turning point)',
        ].join('\n'),
      },
      {
        type: 'note',
        label: 'Why not a smaller h',
        text: 'Because smaller stops helping and then starts hurting. Shrinking h reduces the error of the approximation, but subtracting two nearly-equal numbers destroys significant digits, and below about a thousandth that loss wins. At h = 1e-12 the answer is garbage. The sweet spot sits near the cube root of the computer\u2019s precision — around 1e-5 to 1e-3 for ordinary functions.',
      },
      {
        type: 'p',
        text: 'Now the part that matters: collect the slope everywhere, and you have drawn the derivative.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          '// Walk across the curve and record the slope at every step.',
          'function derivativeCurve(f, from, to, steps = 200) {',
          '  const points = [];',
          '  for (let i = 0; i <= steps; i++) {',
          '    const x = from + (to - from) * (i / steps);',
          '    points.push([x, slopeAt(f, x)]);',
          '  }',
          '  return points;',
          '}',
          '',
          '// Plot these against the original and the whole subject opens up:',
          '// where the derivative crosses zero, the original was flat.',
          'derivativeCurve(x => x ** 3 - 3 * x, -2.5, 2.5);',
        ].join('\n'),
      },
      {
        type: 'p',
        text: 'Plot both on the same axes. Every point where the lower curve crosses zero sits directly beneath a peak or a valley of the upper one. Nothing told it to do that — it falls out of what a slope is.',
      },
      {
        type: 'h3', text: 'Check yourself' },
      {
        type: 'list',
        ordered: true,
        items: [
          'Predict the slope of `x * x` at x = 5 before running it. Then run it.',
          'Find, by dragging the instrument above, the two places where `x\u00b3 \u2212 3x` is flat. Confirm with `slopeAt`.',
          'Try `slopeAt(Math.abs, 0)`. It returns 0, and it should not — the function has a corner there and no single slope exists. Work out why the formula was fooled.',
        ],
      },      {
        type: 'note',
        label: 'How the computer does it',
        text: 'Not with algebra. It measures: take a point a thousandth to the left and a thousandth to the right, and divide the height difference by the distance between them. That gives the slope to about six decimal places — and it works for any function, including one somebody just typed in, which algebra does not.',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: 'modelling-credit-risk',
    index: '05',
    title: 'Modelling credit risk',
    standfirst:
      'Decomposing expected loss into probability of default, loss given default and exposure — and why correlation rather than the average sets the capital.',
    topic: 'Quantitative',
    tags: ['quantitative'],
    outcome:
      'Decompose a lending decision into the three questions behind it, and price the risk of an account.',
    prerequisites: ['Arithmetic. Nothing else.'],
    date: '2026-08-22',
    color: '#d9e9db',
    ink: '#1d5632',
    blocks: [
      {
        type: 'p',
        text: 'When a lender decides whether to give you a card, and what limit to put on it, they are estimating one number. It is worth knowing what it is, because it is far less mysterious than it sounds and it decomposes into three ordinary questions.',
      },

      { type: 'h2', text: 'Three questions: default, loss and exposure' },
      {
        type: 'defs',
        items: [
          {
            term: 'Will they stop paying?',
            description:
              'The probability of default — the chance this borrower stops paying within the next year. Called PD.',
          },
          {
            term: 'How much will be owed when they do?',
            description:
              'Exposure at default. Not the limit and not today’s balance: people tend to draw down more as they get into trouble, so this is usually higher than what is owed now. Called EAD.',
          },
          {
            term: 'How much of that is never coming back?',
            description:
              'Loss given default — the share not recovered after collections. On unsecured cards this is high, because there is nothing to repossess. Called LGD.',
          },
        ],
      },
      {
        type: 'equation',
        words:
          'The expected loss is the chance they default, multiplied by how much is owed at that moment, multiplied by the share never recovered.',
        symbols: 'EL = PD × EAD × LGD',
        where: [
          { symbol: 'EL', means: 'expected loss, in currency — what this account is likely to cost the lender over a year' },
          { symbol: 'PD', means: 'probability of default, between 0 and 1. 0.03 means a 3% chance' },
          { symbol: 'EAD', means: 'exposure at default — the balance expected to be outstanding when it happens' },
          { symbol: 'LGD', means: 'loss given default, between 0 and 1. 0.75 means three-quarters of it is never recovered' },
        ],
        substituted: '0.03 × $4,200 × 0.75',
        result: '$94.50',
        soWhat:
          'That is the price of the risk. Charge less than it over a year and the account loses money on average, however well-behaved it looks.',
      },
      {
        type: 'note',
        label: 'Expected is not the same as likely',
        text: '$94.50 is an average across many accounts like this one. This particular account will almost certainly lose nothing at all — or several thousand. Nobody loses ninety-four dollars. The number is only meaningful across a book, which is exactly why a lender thinks in portfolios and an individual borrower finds the decision baffling.',
      },

      { type: 'h2', text: 'Why expected loss is not enough' },
      {
        type: 'p',
        text: 'Expected loss is budgeted for — it is priced into the interest rate like any other cost of doing business. What actually kills a lender is the unexpected part: the year when far more accounts default at once than usual.',
      },
      {
        type: 'p',
        text: 'And they do arrive at once. Defaults are not independent events — the same recession that costs one borrower their job costs thousands of others theirs. That correlation is the whole game, and it is why the regulatory capital formulas are not simply the sum of individual expected losses.',
      },
      { type: 'h2', text: 'Build it yourself' },
      {
        type: 'p',
        text: 'Expected loss for one account is a multiplication. The interesting code is what comes after it.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          '// One account. PD and LGD are fractions between 0 and 1.',
          'const expectedLoss = (pd, ead, lgd) => pd * ead * lgd;',
          '',
          'expectedLoss(0.03, 4200, 0.75);   // 94.50',
        ].join('\n'),
      },
      {
        type: 'p',
        text: 'Now the part that actually matters. Expected loss is budgeted for. What ruins a lender is the year when far more accounts default at once than usual — and they do arrive at once, because the same recession costs thousands of people their jobs together.',
      },
      {
        type: 'p',
        text: 'That shared cause is modelled with a single common factor: one number drawn per scenario that pushes every borrower in the same direction, plus a private number for each of them.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          '// A book of identical accounts, simulated many times over.',
          '// rho is how much of each borrower’s fate is shared with everyone',
          '// else: 0 means independent, 1 means they all default together.',
          'function simulateBook({ accounts, pd, ead, lgd, rho, scenarios }) {',
          '  const draw = normals();                 // from the Monte Carlo lesson',
          '  const threshold = inverseNormal(pd);    // the point below which one defaults',
          '  const losses = [];',
          '',
          '  for (let s = 0; s < scenarios; s++) {',
          '    const economy = draw();               // ONE draw for the whole year',
          '    let defaults = 0;',
          '',
          '    for (let i = 0; i < accounts; i++) {',
          '      // Each borrower is part shared economy, part their own luck.',
          '      // The weights are sqrt(rho) and sqrt(1-rho) so the total still',
          '      // has a spread of exactly 1 — otherwise rho changes the default',
          '      // rate as well as the correlation, and nothing means anything.',
          '      const z = Math.sqrt(rho) * economy + Math.sqrt(1 - rho) * draw();',
          '      if (z < threshold) defaults++;',
          '    }',
          '    losses.push(defaults * ead * lgd);',
          '  }',
          '',
          '  losses.sort((a, b) => a - b);',
          '  return {',
          '    expected: losses.reduce((a, b) => a + b, 0) / scenarios,',
          '    worstIn100: losses[Math.floor(0.99 * scenarios)],',
          '  };',
          '}',
        ].join('\n'),
      },
      {
        type: 'embed',
        component: 'credit',
        caption: 'Drag the correlation — watch the average hold still and the tail explode',
      },
      {
        type: 'note',
        label: 'Run it twice and the whole subject lands',
        text: 'Set rho to 0 and the worst year in a hundred is barely above the average — with independent borrowers, the good and bad cancel out and a large book is almost risk-free. Set rho to 0.2, which is roughly what regulators assume for retail credit, and the same book’s worst year is several times its average. Nothing else changed. That gap is the entire reason banks hold capital, and it is invisible until you simulate it.',
      },
      {
        type: 'p',
        text: 'The expected loss is what you charge for. The distance between it and the bad year is what you must be able to survive — and only the second one requires a simulation.',
      },
      {
        type: 'note',
        label: 'Where this one is up to',
        text: 'The instrument for this — a cardholder profile with all three terms exposed, and correlated defaults simulated across a book — is being built. It is listed as in progress on the work index rather than presented as finished, which is the honest state of it.',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: 'logistic-regression-on-market-returns',
    index: '06',
    title: 'Logistic regression',
    standfirst:
      'Fitting a logistic regression by gradient descent on two years of returns, then measuring it against the base rate it has to beat.',
    topic: 'Machine learning',
    tags: ['machine-learning', 'quantitative'],
    outcome:
      'Train a classifier by gradient descent, and — more usefully — tell whether it has learned anything at all.',
    prerequisites: ['Helps to have read the Monte Carlo entry first, but it is not required.'],
    date: '2026-08-22',
    color: '#e8dff2',
    ink: '#4a2c6b',
    blocks: [
      {
        type: 'p',
        text: 'The expression on the landing page’s e-ink panel is set by a trained classifier rather than by a threshold someone picked. Building it that way raises the question that turns out to be harder than the training: how do you establish whether a model has learned anything at all?',
      },
      {
        type: 'p',
        text: 'What follows is the model itself — its inputs, how it is fitted by gradient descent, what it scored against the base rate, and the three ways a result like it can look better than it is.',
      },

      { type: 'h2', text: 'What "a model" means here' },
      {
        type: 'p',
        text: 'A model is a formula with numbers in it that nobody chose. You decide the SHAPE — what goes in, what comes out — and then a procedure adjusts the numbers until the formula fits data you already have. Those adjusted numbers are what "learned" means. There is nothing else in the box.',
      },
      {
        type: 'term',
        word: 'Logistic regression',
        plain:
          'The simplest useful model for a yes-or-no question. It multiplies each input by a weight, adds them up, and squashes the total into a number between 0 and 1 that you can read as a probability. Older than computers, and still the thing to try first — if it fails, that is usually the data telling you something rather than the model being too simple.',
      },

      { type: 'h2', text: 'The features it looks at' },
      {
        type: 'p',
        text: 'Four numbers, all built from prices before the day being predicted. That last part matters more than anything else in this entry, and I will come back to it.',
      },
      {
        type: 'defs',
        items: [
          { term: 'Yesterday\u2019s move', description: 'How far it moved, measured in units of how far it normally moves. A 3% day is ordinary for one company and an event for another, so raw percentages cannot be compared across names.' },
          { term: 'Five-day momentum', description: 'The last week, added up and scaled the same way.' },
          { term: 'Twenty-day momentum', description: 'The last month, likewise.' },
          { term: 'Volatility regime', description: 'Whether the last two weeks have been calmer or wilder than the last three months. A market changing character is sometimes informative.' },
        ],
      },
      {
        type: 'note',
        label: 'The mistake that fabricates a genius',
        text: 'Every feature is built from data STRICTLY BEFORE the day being predicted. Slip today\u2019s return into the features for today\u2019s direction and accuracy jumps to 100% — because the answer is now inside the question. It is called lookahead leakage, it is silent, nothing errors, and it is the single most common reason a published trading model cannot be reproduced.',
      },

      { type: 'h2', text: 'How it learns: gradient descent' },
      {
        type: 'p',
        text: 'Gradient descent. Start with every weight at zero, which means the model has no opinion. Make a prediction for every day in the training set, measure how wrong you were, and nudge each weight a little in the direction that would have made you less wrong. Repeat a few thousand times.',
      },
      {
        type: 'equation',
        words:
          'For each input, the nudge is how wrong the prediction was, multiplied by the value of that input.',
        symbols: '\u2202L\u2044\u2202w\u1d62 = ( p \u2212 y ) \u00d7 x\u1d62',
        where: [
          { symbol: '\u2202L\u2044\u2202w\u1d62', means: 'how much the error changes if you change weight i — the "gradient", which is just a slope' },
          { symbol: 'p', means: 'the probability the model predicted, between 0 and 1' },
          { symbol: 'y', means: 'what actually happened: 1 if the day was up, 0 if down' },
          { symbol: 'x\u1d62', means: 'the value of input i on that day' },
        ],
        soWhat:
          'If the model said 0.7 and the day was up, p \u2212 y is \u22120.3 and the weights on whatever was large that day get pushed up. Wrong in the other direction and they get pushed down. That is the whole algorithm.',
      },
      {
        type: 'p',
        text: 'It is worth noticing how simple that is. Nothing in it is specific to markets, and the same three lines train the models behind most of what gets called machine learning. The difficulty is almost never the learning; it is whether there was anything there to learn.',
      },

      { type: 'h2', text: 'Build it yourself' },
      {
        type: 'p',
        text: 'Gradient descent for logistic regression is genuinely this short. Nothing has been left out.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          'const sigmoid = z => 1 / (1 + Math.exp(-z));',
          '',
          '// rows: [{ features: [...], label: 0 or 1 }, ...]',
          'function fit(rows, { epochs = 4000, rate = 0.35, l2 = 0.02 } = {}) {',
          '  const n = rows[0].features.length;',
          '  const weights = new Array(n).fill(0);',
          '  let bias = 0;',
          '',
          '  for (let epoch = 0; epoch < epochs; epoch++) {',
          '    const gradW = new Array(n).fill(0);',
          '    let gradB = 0;',
          '',
          '    for (const row of rows) {',
          '      const z = row.features.reduce((s, f, i) => s + f * weights[i], bias);',
          '      const error = sigmoid(z) - row.label;   // the whole gradient',
          '      for (let i = 0; i < n; i++) gradW[i] += error * row.features[i];',
          '      gradB += error;',
          '    }',
          '',
          '    for (let i = 0; i < n; i++) {',
          '      // The L2 penalty applies to weights, NEVER to the bias — the',
          '      // bias is how the model learns the base rate.',
          '      weights[i] -= rate * (gradW[i] / rows.length + l2 * weights[i]);',
          '    }',
          '    bias -= rate * (gradB / rows.length);',
          '  }',
          '',
          '  return { weights, bias };',
          '}',
        ].join('\n'),
      },
      {
        type: 'note',
        label: 'Standardise first, and keep the numbers',
        text: 'Subtract each feature\u2019s mean and divide by its standard deviation before fitting, or a feature that happens to be measured in larger units dominates purely because it is larger. Then KEEP those means and deviations and apply the identical ones at prediction time. Fitting on standardised features and predicting on raw ones is called training\u2013serving skew: nothing errors, and every answer is quietly wrong.',
      },
      {
        type: 'p',
        text: 'And the evaluation, which is the part that decides whether any of it meant anything.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: [
          'function evaluate(rows, model) {',
          '  let correct = 0, ups = 0;',
          '  for (const row of rows) {',
          '    const z = row.features.reduce((s, f, i) => s + f * model.weights[i], model.bias);',
          '    if ((sigmoid(z) >= 0.5 ? 1 : 0) === row.label) correct++;',
          '    ups += row.label;',
          '  }',
          '  return {',
          '    accuracy: correct / rows.length,',
          '    // The score from always guessing the commonest answer.',
          '    // THIS is the bar, not 50%.',
          '    baseRate: Math.max(ups, rows.length - ups) / rows.length,',
          '  };',
          '}',
          '',
          '// Split by TIME, never at random:',
          'const cut = Math.floor(rows.length * 0.7);',
          'const model = fit(rows.slice(0, cut));',
          'evaluate(rows.slice(cut), model);   // the only number that counts',
        ].join('\n'),
      },
      { type: 'h2', text: 'What the model actually learned' },
      {
        type: 'p',
        text: 'Trained on 1,843 days across six companies and tested on 791 later days it had never seen, the model got 52.7% of them right.',
      },
      {
        type: 'p',
        text: 'That sounds like a coin flip beaten. It is not, and seeing why is the whole point of this entry.',
      },
      {
        type: 'term',
        word: 'Base rate',
        plain:
          'The score you get from the laziest possible model — always guess the most common answer. Markets drift upward over time, so more days are up than down. On this test set, always guessing "up" scores 53.2%.',
      },
      {
        type: 'p',
        text: 'The model scores 52.7%. Guessing "up" every single day, with no inputs and no training, scores 53.2%. The model is not better. It is very slightly worse.',
      },
      {
        type: 'note',
        label: 'This is the expected answer',
        text: 'If four numbers derived from past prices could predict tomorrow, someone with a hundred million dollars and a faster computer would already have traded that away. What is left after they are finished is close to noise, and a model that claimed otherwise on two years of daily data would be overfitted, leaking, or lying. Reporting it is not a failure — reporting something else would have been.',
      },

      { type: 'h2', text: 'Three ways a result like this gets faked' },
      {
        type: 'list',
        ordered: true,
        items: [
          'Quoting accuracy on the TRAINING data. A model can memorise; the number that matters is on days it never saw. This one scores 51.5% on what it was trained on and 52.7% on what it was not.',
          'Comparing to 50% instead of to the base rate. Any number above half looks like skill until you notice that guessing "up" already gets 53.2%.',
          'Splitting the data randomly instead of chronologically. Shuffle days and the model gets to see the future of its own test set through overlapping windows — a form of leakage that inflates the score and is invisible in the code.',
        ],
      },

      { type: 'h2', text: 'Calibration, not accuracy' },
      {
        type: 'p',
        text: 'For a problem with this little signal, accuracy is close to useless — a model can score well by ignoring its inputs entirely. The more useful question is whether it means what it says.',
      },
      {
        type: 'term',
        word: 'Calibration',
        plain:
          'Whether a stated probability matches reality. If a forecaster says 30% on a hundred occasions and it happens about thirty times, they are well calibrated — even if they are never confident and never dramatic. A calibrated model with no edge is honest and useful. An overconfident one is dangerous however often it happens to be right.',
      },
      {
        type: 'p',
        text: 'Sorted into five groups from least to most confident, the model\u2019s predictions do line up in roughly the right order on data it never saw: its most confident fifth was right more often than its least confident fifth. The relationship is weak and not perfectly monotonic — but it is there, and it is a far more interesting result than the accuracy number.',
      },

      { type: 'h2', text: 'What the face on the board shows' },
      {
        type: 'p',
        text: 'Showing the model\u2019s confidence, not a prediction you should act on.',
      },
      {
        type: 'p',
        text: 'The model\u2019s outputs span about 2.14 percentage points — from roughly 50.4% to 52.5%. Mapping that straight onto expressions would leave the companion permanently neutral, so the face shows where today sits inside the model\u2019s OWN range instead. "More bullish than four days in five" is a real statement. "51.3% chance of a rise" is technically true and communicates nothing.',
      },
      {
        type: 'p',
        text: 'The colour comes from somewhere else entirely: red for a fall, green for a rise, because that is what every reader of a market screen already expects. Mood from the model, sign from the market.',
      },
      {
        type: 'note',
        label: 'Do not trade on the companion',
        text: 'It is a demonstration of method on a problem chosen because it is hard, not a signal. The most useful thing it does is show what an honest evaluation looks like when the answer is "barely" — which, in this field, is what the answer usually is.',
      },
    ],
  },
];

export const entryBySlug = (slug: string): Entry | undefined =>
  entries.find((e) => e.slug === slug);

/**
 * Words in an entry, for its reading time.
 *
 * Counts the prose blocks and skips code, symbols and the `where` lists. Code is
 * not read at reading speed — it is scanned or studied, never both — and
 * including it inflates the estimate enough that the figure stops being useful.
 */
export function entryWordCount(entry: Entry): number {
  let words = 0;
  for (const block of entry.blocks) {
    if ('text' in block && typeof block.text === 'string') {
      words += block.text.trim().split(/\s+/).length;
    }
    if (block.type === 'list') {
      words += block.items.join(' ').trim().split(/\s+/).length;
    }
    if (block.type === 'defs') {
      words += block.items
        .map((i) => `${i.term} ${i.description}`)
        .join(' ')
        .trim()
        .split(/\s+/).length;
    }
    if (block.type === 'equation') {
      words += block.words.trim().split(/\s+/).length;
    }
  }
  return words;
}
