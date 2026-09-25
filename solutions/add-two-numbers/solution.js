/**
 * @param {ListNode} l1
 * @param {ListNode} l2
 * @return {ListNode}
 */
function addTwoNumbers(l1, l2) {
  const dummy = new ListNode();
  let tail = dummy;
  let carry = 0;
  while (l1 || l2 || carry) {
    const total = carry + (l1 ? l1.val : 0) + (l2 ? l2.val : 0);
    carry = Math.floor(total / 10); // e.g. 17 -> carry 1, digit 7
    tail.next = new ListNode(total % 10);
    tail = tail.next;
    l1 = l1 && l1.next;
    l2 = l2 && l2.next;
  }
  return dummy.next;
}
