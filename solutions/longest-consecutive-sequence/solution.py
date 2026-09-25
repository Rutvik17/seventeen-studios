class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        have = set(nums)
        best = 0
        for x in have:
            if x - 1 in have:
                continue  # not the start of a run: its run is counted from its start
            length = 1
            while x + length in have:
                length += 1
            best = max(best, length)
        return best
