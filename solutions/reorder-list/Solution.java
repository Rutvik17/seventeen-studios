class Solution {
    public void reorderList(ListNode head) {
        // 1. Find the middle: fast moves two steps for each one of slow.
        ListNode slow = head, fast = head.next;
        while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }
        // 2. Cut the list in two and reverse the second half.
        ListNode second = slow.next, prev = null;
        slow.next = null;
        while (second != null) { ListNode next = second.next; second.next = prev; prev = second; second = next; }
        // 3. Weave them together: one from the front, one from the (reversed) back.
        ListNode first = head;
        second = prev;
        while (second != null) {
            ListNode n1 = first.next, n2 = second.next;
            first.next = second;
            second.next = n1;
            first = n1;
            second = n2;
        }
    }
}
