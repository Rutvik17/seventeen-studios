/**
 * @param {ListNode} head
 * @param {number} k
 * @return {ListNode}
 */
function reverseKGroup(head, k) {
  const dummy = new ListNode(0, head);
  let before = dummy; // the node just before the group being reversed
  for (;;) {
    let end = before; // find the group's last node, if the group is complete
    for (let i = 0; i < k; i++) {
      end = end.next;
      if (!end) return dummy.next; // fewer than k left: leave them as they are
    }
    const after = end.next;
    // Reverse the group, pointing its first node at what comes after it.
    let prev = after;
    let cur = before.next;
    while (cur !== after) {
      const next = cur.next;
      cur.next = prev;
      prev = cur;
      cur = next;
    }
    const first = before.next; // now the group's last node
    before.next = end; // the old last node leads the group
    before = first;
  }
}
