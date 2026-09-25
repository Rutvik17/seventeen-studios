/**
 * @param {Node} node
 * @return {Node}
 */
function cloneGraph(node) {
  const copies = new Map(); // original node -> its copy
  const clone = (n) => {
    if (copies.has(n)) return copies.get(n);
    const copy = new Node(n.val);
    copies.set(n, copy); // recorded before the neighbours, so a cycle back to n finds it
    copy.neighbors = n.neighbors.map(clone);
    return copy;
  };
  return node ? clone(node) : null;
}
