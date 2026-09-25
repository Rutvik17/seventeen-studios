class MedianFinder:
    def __init__(self):
        # low: the smaller half, as a max-heap (values negated); high: the larger half, a min-heap.
        # low holds the same number as high, or one more.
        self.low, self.high = [], []

    def addNum(self, num: int) -> None:
        heappush(self.low, -num)
        heappush(self.high, -heappop(self.low))  # the largest of the low half moves up
        if len(self.high) > len(self.low):
            heappush(self.low, -heappop(self.high))  # rebalance

    def findMedian(self) -> float:
        if len(self.low) > len(self.high):
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2
