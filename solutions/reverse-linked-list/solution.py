class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        prev = None  # the part already reversed
        cur = head
        while cur:
            nxt = cur.next  # remember the rest before cutting it off
            cur.next = prev  # point this node backwards
            prev, cur = cur, nxt
        return prev
