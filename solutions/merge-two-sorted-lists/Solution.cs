public class Solution {
    public ListNode MergeTwoLists(ListNode list1, ListNode list2) {
        var dummy = new ListNode(); // a placeholder in front of the result
        var tail = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) { tail.next = list1; list1 = list1.next; }
            else { tail.next = list2; list2 = list2.next; }
            tail = tail.next;
        }
        tail.next = list1 ?? list2; // whatever is left is already sorted
        return dummy.next;
    }
}
