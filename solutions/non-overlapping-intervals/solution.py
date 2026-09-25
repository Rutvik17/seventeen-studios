class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        # Keep as many as possible: always keep the one that ends first — it leaves the most room.
        intervals.sort(key=lambda iv: iv[1])
        kept, end = 0, float("-inf")
        for s, e in intervals:
            if s >= end:  # fits after the last one kept (touching is fine)
                kept, end = kept + 1, e
        return len(intervals) - kept
