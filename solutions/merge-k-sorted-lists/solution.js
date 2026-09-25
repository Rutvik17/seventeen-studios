/**
 * @param {ListNode[]} lists
 * @return {ListNode}
 */
function mergeKLists(lists) {
  // Merge in pairs, like merge sort: log k rounds, each touching every node once.
  let round = lists.filter(Boolean);
  if (!round.length) return null;
  const merge = (a, b) => {
    const dummy = new ListNode();
    let t = dummy;
    while (a && b) {
      if (a.val <= b.val) {
        t.next = a;
        a = a.next;
      } else {
        t.next = b;
        b = b.next;
      }
      t = t.next;
    }
    t.next = a ?? b;
    return dummy.next;
  };
  while (round.length > 1) {
    const next = [];
    for (let i = 0; i < round.length; i += 2) next.push(i + 1 < round.length ? merge(round[i], round[i + 1]) : round[i]);
    round = next;
  }
  return round[0];
}
