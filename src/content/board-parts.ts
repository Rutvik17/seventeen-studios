/**
 * What every part on the board is, for someone who has never seen one.
 *
 * ---
 *
 * THE RULE THIS FILE IS WRITTEN UNDER
 *
 * Assume the reader has never studied electronics. Not "rusty" — none. Every
 * entry has to survive being read by someone who does not know what a capacitor
 * is, what a volt is, or why a chip would need a clock.
 *
 * So each part gets three things, and the order is deliberate:
 *
 *   `is`   — what it IS, in a sentence with no jargon in it at all
 *   `does` — what it does on THIS board specifically
 *   `why`  — why it has to be there, usually by describing what breaks without it
 *
 * The third one is the one that teaches. "A decoupling capacitor stabilises the
 * supply" is a definition you can read and retain nothing from. "The chip pulls
 * current in sharp bursts, and the wire from the regulator is too slow to keep
 * up, so the voltage sags and the chip resets" is a picture — and once you have
 * the picture the name is obvious.
 *
 * `analogy` is optional and only used where a physical comparison genuinely
 * helps. A forced analogy is worse than none: it gives the reader a second
 * wrong thing to unlearn.
 */

export type PartExplainer = {
  ref: string;
  /** Plain name, not the part number. */
  name: string;
  is: string;
  does: string;
  why: string;
  analogy?: string;
  /** A number worth knowing, and its unit spelled out. */
  spec?: { label: string; value: string };
};

export const boardParts: PartExplainer[] = [
  {
    ref: 'U1',
    name: 'The computer',
    is: 'A complete computer about the size of a postage stamp, with a processor, memory and a radio for Wi-Fi already inside it.',
    does: 'Wakes up every so often, connects to Wi-Fi, fetches a stock price and a bus time, decides what face to draw, sends that picture to the screen, and goes back to sleep.',
    why: 'Everything else on the board exists to serve this part. It is the only thing here that makes a decision — the rest either feed it, time it, or are told what to do by it.',
    analogy:
      'Think of a phone with the screen, battery and case removed. What is left is roughly this.',
    spec: { label: 'Costs about', value: '$3' },
  },
  {
    ref: 'J1',
    name: 'The USB-C socket',
    is: 'The socket you plug a normal phone charger into.',
    does: 'Brings in electricity, and carries the program from a laptop onto the chip.',
    why: 'It is how the thing gets both its power and its instructions. Without it you would have to lift the chip off and program it separately every time you changed a line of code.',
    spec: { label: 'Delivers', value: '5 volts' },
  },
  {
    ref: 'U2',
    name: 'The voltage regulator',
    is: 'A part that takes electricity in at one strength and lets it out at a lower, steadier one.',
    does: 'Turns the 5 volts arriving from USB into the 3.3 volts the computer needs.',
    why: 'Voltage is a measure of electrical push. Give the chip 5 volts when it is built for 3.3 and you destroy it, immediately and permanently. This part is the only thing standing between a charger and a dead chip.',
    analogy:
      'Water pressure. The mains arrives harder than a garden tap can take; a regulator is the valve that steps it down to something the hose survives.',
    spec: { label: 'Output', value: '3.3 volts' },
  },
  {
    ref: 'J3',
    name: 'The battery connector',
    is: 'A two-pin plug for a rechargeable battery, the flat kind found in a phone.',
    does: 'Lets the device run with nothing plugged into it.',
    why: 'A gadget that has to stay tethered to a wall is furniture. The whole design target — a face that tells you something as you walk past — only works if it can sit on a shelf on its own.',
    spec: { label: 'Runs for', value: 'about 45 days' },
  },
  {
    ref: 'Y1',
    name: 'The crystal',
    is: 'A tiny sliver of quartz that vibrates at an extremely precise rate when electricity is applied to it.',
    does: 'Gives the computer a steady beat so it can count time — 32,768 vibrations every second.',
    why: 'A computer has no sense of time on its own. To sleep for ten minutes and wake up, it has to count something regular. Quartz is used because it keeps the same rate whether it is hot or cold, which almost nothing else does.',
    analogy:
      'It is the same part, doing the same job, as the quartz in a wristwatch. That is not a comparison — it is literally the same idea.',
    spec: { label: 'Beats', value: '32,768 times per second' },
  },
  {
    ref: 'J2',
    name: 'The screen connector',
    is: 'A narrow slot that grips a flat, flexible ribbon — the kind of cable inside a laptop hinge.',
    does: 'Carries the picture from the computer out to the display.',
    why: 'The screen is not on the board; it sits in front of it, in the case. Twenty-four separate wires would be unmanageable at this size, so they are printed side by side onto one flexible strip half a millimetre apart.',
    spec: { label: 'Wires', value: '24, at 0.5 mm apart' },
  },
  {
    ref: 'SW1',
    name: 'The button',
    is: 'A button.',
    does: 'Held down while the device is powered on, it tells the computer to accept a new program instead of running the one it already has.',
    why: 'Without a way to interrupt it, a chip running broken code has no route back — it will keep running the broken code forever. This is the escape hatch, and every board should have one.',
  },
  {
    ref: 'C1',
    name: 'A crystal capacitor',
    is: 'A component that holds a very small amount of electrical charge, like a bucket that fills and empties.',
    does: 'Sits beside the crystal and tunes it, so it vibrates at exactly the right rate.',
    why: 'A crystal on its own runs slightly fast or slightly slow depending on what is around it. These two capacitors are chosen to cancel that out. Get them wrong and the clock drifts — the device would gradually lose minutes, then hours.',
    spec: { label: 'Holds', value: '18 picofarads' },
  },
  {
    ref: 'C2',
    name: 'A crystal capacitor',
    is: 'The identical twin of the one on the other side of the crystal.',
    does: 'The pair works together — the crystal needs the same amount of tuning on both of its legs.',
    why: 'They are matched deliberately. An unequal pair pulls the vibration off-centre, which is the same fault as getting the value wrong.',
    spec: { label: 'Holds', value: '18 picofarads' },
  },
  {
    ref: 'C3',
    name: 'The reservoir capacitor',
    is: 'A larger version of the same charge-holding component — a bigger bucket.',
    does: 'Sits at the regulator and smooths out the supply.',
    why: 'A radio does not sip power evenly. It is silent for a moment and then pulls a large gulp to transmit. The wire from the regulator cannot deliver that fast, so the voltage dips and the chip can reset mid-sentence. This part is a local store of charge, right where the gulp happens.',
    analogy:
      'A water tank in a loft. The mains cannot fill a bath instantly, so you keep some water close to the tap.',
    spec: { label: 'Holds', value: '10 microfarads' },
  },
  {
    ref: 'C4',
    name: 'The decoupling capacitor',
    is: 'A small charge store, placed as close to the computer as it will physically fit.',
    does: 'Handles the fastest, smallest demands for power — the ones the reservoir is too far away to catch.',
    why: 'Electricity takes time to travel, and a chip switching millions of times a second is faster than a wire a few centimetres long can respond to. The distance is the whole point: put this part further away and it stops working, without anything about it changing.',
    spec: { label: 'Holds', value: '1 microfarad' },
  },
  {
    ref: 'R1',
    name: 'The pull-up resistor',
    is: 'A component that restricts how much electricity can flow, like a narrow section of pipe.',
    does: 'Gently holds the button’s wire at a known state, so the computer reads a clear "not pressed" when nobody is touching it.',
    why: 'A wire connected to nothing is not "off" — it floats, and picks up interference from the air, so the chip reads random presses. This part ties it down without shorting it out.',
    spec: { label: 'Restricts by', value: '10,000 ohms' },
  },
  {
    ref: 'R2',
    name: 'A USB identity resistor',
    is: 'The same kind of restricting component, in a specific value that means something to a charger.',
    does: 'Tells whatever is plugged in that this device wants power, and how much.',
    why: 'USB-C sockets can supply anything from a trickle to enough to charge a laptop. A charger will not send power until the device identifies itself, and these two resistors are that identification. Leave them off and a perfectly good board is simply dead when plugged in.',
    spec: { label: 'Restricts by', value: '5,100 ohms' },
  },
  {
    ref: 'R3',
    name: 'A USB identity resistor',
    is: 'The partner to the one beside it.',
    does: 'USB-C can be plugged in either way up, so there are two of these — one for each orientation.',
    why: 'The reversible connector is the reason the pair exists. Only one is doing the work at any moment; which one depends on which way round the cable went in.',
    spec: { label: 'Restricts by', value: '5,100 ohms' },
  },
];

export const partByRef = (ref: string): PartExplainer | undefined =>
  boardParts.find((p) => p.ref === ref);
