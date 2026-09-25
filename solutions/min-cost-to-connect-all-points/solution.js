/**
 * @param {number[][]} points
 * @return {number}
 */
function minCostConnectPoints(points) {
  // Prim's algorithm on the complete graph: grow one tree from point 0, always
  // adding the outside point that is cheapest to connect to it.
  const n = points.length;
  const cost = new Array(n).fill(Infinity); // cheapest link from each outside point to the tree
  cost[0] = 0;
  const inside = new Array(n).fill(false);
  let total = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inside[i] && (u < 0 || cost[i] < cost[u])) u = i;
    inside[u] = true;
    total += cost[u];
    for (let v = 0; v < n; v++) {
      // u may offer a cheaper link to the points still outside
      if (!inside[v]) cost[v] = Math.min(cost[v], Math.abs(points[u][0] - points[v][0]) + Math.abs(points[u][1] - points[v][1]));
    }
  }
  return total;
}
