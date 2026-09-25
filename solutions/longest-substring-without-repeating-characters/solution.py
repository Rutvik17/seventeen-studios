class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last = {}  # character -> index where it was last seen
        best = l = 0
        for r, c in enumerate(s):
            if c in last and last[c] >= l:
                l = last[c] + 1  # jump the window's start past the earlier copy
            last[c] = r
            best = max(best, r - l + 1)
        return best
