public class Solution {
    public ListNode RemoveNthFromEnd(ListNode head, int n) {
        var dummy = new ListNode(0, head); // so removing the head needs no special case
        ListNode lead = dummy, trail = dummy;
        for (int i = 0; i <= n; i++) lead = lead.next; // put lead n + 1 nodes ahead of trail
        while (lead != null) { lead = lead.next; trail = trail.next; }
        trail.next = trail.next.next; // trail sits just before the node to remove
        return dummy.next;
    }
}
