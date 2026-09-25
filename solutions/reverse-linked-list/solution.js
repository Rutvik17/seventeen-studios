/**
 * @param {ListNode} head
 * @return {ListNode}
 */
function reverseList(head) {
  let prev = null; // the part already reversed
  let cur = head;
  while (cur) {
    const next = cur.next; // remember the rest before cutting it off
    cur.next = prev; // point this node backwards
    prev = cur;
    cur = next;
  }
  return prev;
}
