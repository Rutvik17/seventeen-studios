public class Solution {
    public Node CopyRandomList(Node head) {
        // 1. Put each copy right after its original: A -> A' -> B -> B' -> ...
        for (var cur = head; cur != null; cur = cur.next.next) {
            var copy = new Node(cur.val) { next = cur.next };
            cur.next = copy;
        }
        // 2. A copy's random is the node right after its original's random.
        for (var cur = head; cur != null; cur = cur.next.next) cur.next.random = cur.random?.next;
        // 3. Unweave the two lists.
        var dummy = new Node(0);
        var tail = dummy;
        for (var cur = head; cur != null; cur = cur.next) {
            var copy = cur.next;
            cur.next = copy.next;
            tail.next = copy;
            tail = copy;
        }
        return dummy.next;
    }
}
