/**
 * @param {ListNode} head
 * @return {void} Do not return anything, modify head in-place instead.
 */
function reorderList(head) {
  // 1. Find the middle: fast moves two steps for each one of slow.
  let slow = head;
  let fast = head.next;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  // 2. Cut the list in two and reverse the second half.
  let second = slow.next;
  slow.next = null;
  let prev = null;
  while (second) {
    const next = second.next;
    second.next = prev;
    prev = second;
    second = next;
  }
  // 3. Weave them together: one from the front, one from the (reversed) back.
  let first = head;
  second = prev;
  while (second) {
    const n1 = first.next;
    const n2 = second.next;
    first.next = second;
    second.next = n1;
    first = n1;
    second = n2;
  }
}
