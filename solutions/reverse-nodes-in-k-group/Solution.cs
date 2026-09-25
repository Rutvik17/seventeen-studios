public class Solution {
    public ListNode ReverseKGroup(ListNode head, int k) {
        var dummy = new ListNode(0, head);
        var before = dummy; // the node just before the group being reversed
        while (true) {
            var end = before; // find the group's last node, if the group is complete
            for (int i = 0; i < k; i++) {
                end = end.next;
                if (end == null) return dummy.next; // fewer than k left: leave them
            }
            ListNode after = end.next, prev = after, cur = before.next;
            while (cur != after) { var next = cur.next; cur.next = prev; prev = cur; cur = next; } // reverse
            var first = before.next; // now the group's last node
            before.next = end; // the old last node leads the group
            before = first;
        }
    }
}
