class Solution:
    def reorderList(self, head: Optional[ListNode]) -> None:
        # 1. Find the middle: fast moves two steps for each one of slow.
        slow, fast = head, head.next
        while fast and fast.next:
            slow, fast = slow.next, fast.next.next
        # 2. Cut the list in two and reverse the second half.
        second, slow.next = slow.next, None
        prev = None
        while second:
            second.next, prev, second = prev, second, second.next
        # 3. Weave them together: one from the front, one from the (reversed) back.
        first, second = head, prev
        while second:
            n1, n2 = first.next, second.next
            first.next, second.next = second, n1
            first, second = n1, n2
