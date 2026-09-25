/**
 * @param {string[][]} tickets
 * @return {string[]}
 */
function findItinerary(tickets) {
  const outOf = new Map(); // airport -> destinations still to fly to
  for (const [a, b] of [...tickets].sort().reverse()) {
    if (!outOf.has(a)) outOf.set(a, []);
    outOf.get(a).push(b); // reverse order, so popping gives the smallest first
  }
  // Hierholzer's algorithm: fly on while tickets remain; an airport with none left
  // is where the route ends, so it is written down last-first.
  const route = [];
  const stack = ['JFK'];
  while (stack.length) {
    const next = outOf.get(stack[stack.length - 1]);
    if (next?.length) stack.push(next.pop());
    else route.push(stack.pop());
  }
  return route.reverse();
}
