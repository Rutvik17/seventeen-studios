class Solution:
    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:
        dummy = ListNode(0, head)  # so removing the head needs no special case
        lead = trail = dummy
        for _ in range(n + 1):
            lead = lead.next  # put lead n + 1 nodes ahead of trail
        while lead:
            lead, trail = lead.next, trail.next
        trail.next = trail.next.next  # trail sits just before the node to remove
        return dummy.next
