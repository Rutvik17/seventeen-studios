class Solution:
    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:
        intervals.sort()  # in order of start: a clash can only be between neighbours
        return all(intervals[i][1] <= intervals[i + 1][0] for i in range(len(intervals) - 1))
