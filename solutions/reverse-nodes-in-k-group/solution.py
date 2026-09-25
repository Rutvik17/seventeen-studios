class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)
        before = dummy  # the node just before the group being reversed
        while True:
            end = before  # find the group's last node, if the group is complete
            for _ in range(k):
                end = end.next
                if not end:
                    return dummy.next  # fewer than k left: leave them as they are
            after = end.next
            # Reverse the group, pointing its first node at what comes after it.
            prev, cur = after, before.next
            while cur is not after:
                cur.next, prev, cur = prev, cur, cur.next
            first = before.next  # now the group's last node
            before.next = end  # the old last node leads the group
            before = first
