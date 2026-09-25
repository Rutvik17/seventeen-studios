class Solution:
    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:
        # A min-heap holds the front node of each list; the smallest front comes out first.
        heap = [(node.val, i, node) for i, node in enumerate(lists) if node]  # i breaks ties
        heapify(heap)
        dummy = tail = ListNode()
        while heap:
            _, i, node = heappop(heap)
            tail.next = tail = node
            if node.next:
                heappush(heap, (node.next.val, i, node.next))  # that list's next front
        return dummy.next
