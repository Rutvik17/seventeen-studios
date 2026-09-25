class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null, cur = head; // prev: the part already reversed
        while (cur != null) {
            ListNode next = cur.next; // remember the rest before cutting it off
            cur.next = prev; // point this node backwards
            prev = cur;
            cur = next;
        }
        return prev;
    }
}
