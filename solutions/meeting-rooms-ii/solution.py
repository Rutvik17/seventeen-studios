class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        # Sweep through time. Each start needs a room; each end frees one. The most rooms
        # busy at once is the answer. An end at the same moment as a start frees its room first.
        starts = sorted(s for s, _ in intervals)
        ends = sorted(e for _, e in intervals)
        busy = best = j = 0
        for s in starts:
            while ends[j] <= s:  # meetings finished by now
                busy -= 1
                j += 1
            busy += 1
            best = max(best, busy)
        return best
