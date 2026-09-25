public class Solution {
    public ListNode AddTwoNumbers(ListNode l1, ListNode l2) {
        var dummy = new ListNode();
        var tail = dummy;
        int carry = 0;
        while (l1 != null || l2 != null || carry != 0) {
            int total = carry + (l1?.val ?? 0) + (l2?.val ?? 0);
            carry = total / 10; // e.g. 17 -> carry 1, digit 7
            tail.next = new ListNode(total % 10);
            tail = tail.next;
            l1 = l1?.next;
            l2 = l2?.next;
        }
        return dummy.next;
    }
}
