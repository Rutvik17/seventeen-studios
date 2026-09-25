class Solution:
    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
        out, i, n = [], 0, len(intervals)
        s, e = newInterval
        while i < n and intervals[i][1] < s:  # wholly before the new one: keep as it is
            out.append(intervals[i])
            i += 1
        while i < n and intervals[i][0] <= e:  # overlapping it: absorb into one interval
            s, e = min(s, intervals[i][0]), max(e, intervals[i][1])
            i += 1
        out.append([s, e])
        out.extend(intervals[i:])  # wholly after: keep as they are
        return out
