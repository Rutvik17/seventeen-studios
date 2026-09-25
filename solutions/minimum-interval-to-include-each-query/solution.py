class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        intervals.sort()
        answer = [-1] * len(queries)
        heap = []  # (size, right end) of intervals that have started
        i = 0
        # Answer the queries from smallest to largest, so intervals only ever join and leave.
        for q in sorted(range(len(queries)), key=lambda k: queries[k]):
            x = queries[q]
            while i < len(intervals) and intervals[i][0] <= x:  # every interval starting by x
                l, r = intervals[i]
                heappush(heap, (r - l + 1, r))
                i += 1
            while heap and heap[0][1] < x:  # ended before x: useless now and for every later query
                heappop(heap)
            if heap:
                answer[q] = heap[0][0]  # the smallest interval holding x
        return answer
