/**
 * @param {ListNode} head
 * @return {boolean}
 */
function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next; // one step
    fast = fast.next.next; // two steps
    if (slow === fast) return true; // in a loop, the fast one laps the slow one
  }
  return false; // the fast one fell off the end: no loop
}
