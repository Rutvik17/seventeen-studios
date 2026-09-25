class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        intervals.sort()  # by start: overlapping intervals are now next to each other
        out = []
        for s, e in intervals:
            if out and s <= out[-1][1]:
                out[-1][1] = max(out[-1][1], e)  # overlaps the last one: stretch it
            else:
                out.append([s, e])
        return out
