class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        heap = [-s for s in stones]  # Python's heap gives the smallest, so store weights negated
        heapify(heap)
        while len(heap) > 1:
            y, x = -heappop(heap), -heappop(heap)  # the two heaviest, y >= x
            if y > x:
                heappush(heap, -(y - x))
        return -heap[0] if heap else 0
