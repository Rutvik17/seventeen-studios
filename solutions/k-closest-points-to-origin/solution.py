class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        # A max-heap of the k closest so far (distances negated for Python's min-heap).
        # Squared distance x² + y² orders points the same as distance, without a square root.
        heap = []
        for x, y in points:
            heappush(heap, (-(x * x + y * y), x, y))
            if len(heap) > k:
                heappop(heap)  # the farthest of k + 1 is not among the closest k
        return [[x, y] for _, x, y in heap]
