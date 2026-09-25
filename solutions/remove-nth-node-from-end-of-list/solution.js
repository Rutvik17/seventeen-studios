/**
 * @param {ListNode} head
 * @param {number} n
 * @return {ListNode}
 */
function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head); // so removing the head needs no special case
  let lead = dummy;
  let trail = dummy;
  for (let i = 0; i <= n; i++) lead = lead.next; // put lead n + 1 nodes ahead of trail
  while (lead) {
    lead = lead.next;
    trail = trail.next;
  }
  trail.next = trail.next.next; // trail sits just before the node to remove
  return dummy.next;
}
