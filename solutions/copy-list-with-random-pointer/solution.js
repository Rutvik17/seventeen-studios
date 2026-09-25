/**
 * @param {Node} head
 * @return {Node}
 */
function copyRandomList(head) {
  // 1. Put each copy right after its original: A -> A' -> B -> B' -> ...
  for (let cur = head; cur; cur = cur.next.next) cur.next = new Node(cur.val, cur.next, null);
  // 2. A copy's random is the node right after its original's random.
  for (let cur = head; cur; cur = cur.next.next) cur.next.random = cur.random ? cur.random.next : null;
  // 3. Unweave the two lists.
  const dummy = new Node(0, null, null);
  let tail = dummy;
  for (let cur = head; cur; cur = cur.next) {
    const copy = cur.next;
    cur.next = copy.next;
    tail.next = copy;
    tail = copy;
  }
  return dummy.next;
}
