import type { Block } from './types';

/**
 * The notebook.
 *
 * ---
 *
 * WHAT THESE ARE FOR
 *
 * Each entry explains one of the things on this site, from nothing, to someone
 * who has never studied the subject. Not a write-up for people who could
 * already have built it — those are worth nothing to a reader and nothing to
 * the writer.
 *
 * ---
 *
 * THE RULES, WHICH ARE GRASP'S
 *
 * 1. **Assume no prior knowledge at all.** Not "rusty" — none. Read it back as
 *    someone who does not know what a volt is, and find the first word they
 *    would have had to look up.
 * 2. **Every symbol is introduced before it is used.** The `equation` block
 *    type enforces this: `words` and `where` are required fields, so a symbolic
 *    form cannot be authored without an English sentence and a named list of
 *    every symbol in it.
 * 3. **Show the arithmetic with real numbers in it.** Never a bare result.
 * 4. **No filler.** The standard failure of technical writing is a thousand
 *    words of preamble before the first useful sentence. Start at the thing.
 * 5. **If it can be operated, operate it.** An embedded instrument teaches more
 *    in four seconds of dragging than six paragraphs, and the reader believes it
 *    because they moved it themselves.
 */

export type Entry = {
  slug: string;
  index: string;
  title: string;
  /** One line, on the index row. */
  standfirst: string;
  /** The subject, for the row's pill. */
  topic: string;
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
    slug: 'a-thing-that-tells-you-something',
    index: '01',
    title: 'A thing that tells you something',
    standfirst:
      'Designing a small device from nothing: what every part on a circuit board is for, and why it has to be there.',
    topic: 'Hardware',
    date: '2026-08-22',
    color: '#d3e3da',
    ink: '#123f33',
    blocks: [
      {
        type: 'p',
        text: 'I wanted an object that sits on a shelf and tells me one thing as I walk past. Not a phone I have to unlock and not a screen that glows all night — a small flat thing with a face on it that changes when something changes.',
      },
      {
        type: 'p',
        text: 'This is how it gets built, starting from a bare green rectangle. I am assuming you have never looked inside anything electronic, and nothing below needs you to have.',
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

      { type: 'h2', text: 'Electricity arrives at the wrong strength' },
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

      { type: 'h2', text: 'How wide does a wire have to be?' },
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

      { type: 'h2', text: 'How a computer knows what time it is' },
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

      { type: 'h2', text: 'A screen that uses no power to keep showing something' },
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

      { type: 'h2', text: 'What it costs to stay awake' },
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

      { type: 'h2', text: 'Why a face' },
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
      {
        type: 'note',
        label: 'Where it is up to',
        text: 'The board is designed, not fabricated. Everything above is real: real packages, real footprints, real calculations. What has not happened yet is sending it to a manufacturer and finding out which of my assumptions were wrong — and that is genuinely the most useful part, which is why it will get its own entry when it happens.',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: 'guessing-well',
    index: '02',
    title: 'Guessing well',
    standfirst:
      'How you work out the chance of something when the maths is too hard to solve — starting with a coin.',
    topic: 'Quantitative',
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
        text: 'The second sounds like cheating. It is not, it is often the only thing available, and it has a name.',
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

      { type: 'h2', text: 'The same trick, applied to money' },
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

      { type: 'h2', text: 'Run it' },
      {
        type: 'p',
        text: 'Real prices, fetched when this page was built. Move anything and fifty thousand futures are redrawn in your browser.',
      },
      { type: 'embed', component: 'risk', caption: 'Live Monte Carlo — move the inputs' },
      {
        type: 'p',
        text: 'The column labelled "disagreement" is the important one. For this particular model an exact answer does exist, so the panel computes both and shows the gap. A simulation that lands within a fraction of a percent of theory is a claim you can check rather than one you have to take.',
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
    slug: 'why-animation-looks-fake',
    index: '03',
    title: 'Why animation looks fake',
    standfirst:
      'Nothing on this site is keyframed. The difference between a curve and a force, and why your eye catches it.',
    topic: 'Motion',
    date: '2026-08-22',
    color: '#f8dde1',
    ink: '#8f2338',
    blocks: [
      {
        type: 'p',
        text: 'Most motion on the web is a curve. You say "move from here to there over 300 milliseconds, easing out", and the browser interpolates. It works, it is cheap, and something about it is subtly dead.',
      },
      {
        type: 'p',
        text: 'Here is the tell. Interrupt it. Start the animation, and halfway through, change your mind and send it somewhere else. A curve restarts from wherever it happens to be, at zero speed, as though the first movement never happened. Nothing physical does that.',
      },

      { type: 'h2', text: 'What a real object does instead' },
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

      { type: 'h2', text: 'Where the arms come from' },
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
      { type: 'embed', component: 'spring', caption: 'Move the constants — this is the live rig' },
      {
        type: 'p',
        text: 'Drag damping to zero and watch nothing ever settle. That is not a bug being demonstrated; it is what the equation says happens when you remove the only term that takes energy out.',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: 'steepness',
    index: '04',
    title: 'Steepness',
    standfirst:
      'Calculus is one idea about slopes, buried under notation. Here it is without the notation.',
    topic: 'Teaching',
    date: '2026-08-22',
    color: '#dce5fc',
    ink: '#12379c',
    blocks: [
      {
        type: 'p',
        text: 'Ask an adult who did well at school what a derivative is and you usually get a procedure back — bring the power down, take one off — delivered fluently by someone who cannot tell you what the answer measures.',
      },
      {
        type: 'p',
        text: 'That is not a failure of memory. It is what happens when something geometric is only ever taught symbolically.',
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

      { type: 'h2', text: 'The problem with a curve' },
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

      { type: 'h2', text: 'The part that actually opens the subject' },
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
      {
        type: 'note',
        label: 'How the computer does it',
        text: 'Not with algebra. It measures: take a point a thousandth to the left and a thousandth to the right, and divide the height difference by the distance between them. That gives the slope to about six decimal places — and it works for any function, including one somebody just typed in, which algebra does not.',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: 'what-a-lender-is-afraid-of',
    index: '05',
    title: 'What a lender is afraid of',
    standfirst:
      'Credit risk is three questions, not one. Taking apart the number behind every lending decision.',
    topic: 'Quantitative',
    date: '2026-08-22',
    color: '#d9e9db',
    ink: '#1d5632',
    blocks: [
      {
        type: 'p',
        text: 'When a lender decides whether to give you a card, and what limit to put on it, they are estimating one number. It is worth knowing what it is, because it is far less mysterious than it sounds and it decomposes into three ordinary questions.',
      },

      { type: 'h2', text: 'The three questions' },
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

      { type: 'h2', text: 'Why the average is not enough' },
      {
        type: 'p',
        text: 'Expected loss is budgeted for — it is priced into the interest rate like any other cost of doing business. What actually kills a lender is the unexpected part: the year when far more accounts default at once than usual.',
      },
      {
        type: 'p',
        text: 'And they do arrive at once. Defaults are not independent events — the same recession that costs one borrower their job costs thousands of others theirs. That correlation is the whole game, and it is why the regulatory capital formulas are not simply the sum of individual expected losses.',
      },
      {
        type: 'note',
        label: 'Where this one is up to',
        text: 'The instrument for this — a cardholder profile with all three terms exposed, and correlated defaults simulated across a book — is being built. It is listed as in progress on the work index rather than presented as finished, which is the honest state of it.',
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
