class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        # 1. Put each copy right after its original: A -> A' -> B -> B' -> ...
        cur = head
        while cur:
            cur.next = Node(cur.val, cur.next)
            cur = cur.next.next
        # 2. A copy's random is the node right after its original's random.
        cur = head
        while cur:
            cur.next.random = cur.random.next if cur.random else None
            cur = cur.next.next
        # 3. Unweave the two lists.
        dummy = tail = Node(0)
        cur = head
        while cur:
            copy = cur.next
            cur.next = copy.next
            tail.next = copy
            tail, cur = copy, cur.next
        return dummy.next
