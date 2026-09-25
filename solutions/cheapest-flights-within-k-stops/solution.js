/**
 * @param {number} n
 * @param {number[][]} flights
 * @param {number} src
 * @param {number} dst
 * @param {number} k
 * @return {number}
 */
function findCheapestPrice(n, flights, src, dst, k) {
  // Bellman-Ford, stopped after k + 1 rounds: after round r, cost[v] is the cheapest
  // way to v using at most r flights (at most r - 1 stops).
  let cost = new Array(n).fill(Infinity);
  cost[src] = 0;
  for (let r = 0; r <= k; r++) {
    const before = cost; // read last round's costs, so one round adds only one flight
    cost = [...before];
    for (const [u, v, p] of flights) if (before[u] + p < cost[v]) cost[v] = before[u] + p;
  }
  return cost[dst] === Infinity ? -1 : cost[dst];
}
