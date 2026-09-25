class Solution:
    def numDistinct(self, s: str, t: str) -> int:
        # ways[j]: ways to pick t[:j] from the part of s read so far. Each new letter of s can
        # either be skipped, or — if it equals t[j - 1] — end a copy of t[:j].
        ways = [1] + [0] * len(t)  # the empty t is picked one way
        for ch in s:
            for j in range(len(t), 0, -1):  # downwards, so this letter is used once
                if t[j - 1] == ch:
                    ways[j] += ways[j - 1]
        return ways[len(t)]
