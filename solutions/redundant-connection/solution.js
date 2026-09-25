/**
 * @param {number[][]} edges
 * @return {number[]}
 */
function findRedundantConnection(edges) {
  // Union-find: each node points toward a representative of its connected group.
  const parent = Array.from({ length: edges.length + 1 }, (_, i) => i);
  const size = new Array(edges.length + 1).fill(1);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // halve the path as we go
      x = parent[x];
    }
    return x;
  };
  for (const [a, b] of edges) {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) return [a, b]; // already connected: this edge closes a cycle
    if (size[ra] < size[rb]) [ra, rb] = [rb, ra];
    parent[rb] = ra; // hang the smaller group under the larger
    size[ra] += size[rb];
  }
  return [];
}
