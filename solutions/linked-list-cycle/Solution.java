class Solution {
    public boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next; // one step
            fast = fast.next.next; // two steps
            if (slow == fast) return true; // in a loop, the fast one laps the slow one
        }
        return false; // the fast one fell off the end: no loop
    }
}
