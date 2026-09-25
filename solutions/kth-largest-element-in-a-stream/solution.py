class KthLargest:
    def __init__(self, k: int, nums: List[int]):
        # A min-heap of the k largest so far: its top, the smallest of them, is the k-th largest.
        self.k = k
        self.heap = []
        for x in nums:
            self.add(x)

    def add(self, val: int) -> int:
        heappush(self.heap, val)
        if len(self.heap) > self.k:
            heappop(self.heap)  # no longer among the k largest
        return self.heap[0]
