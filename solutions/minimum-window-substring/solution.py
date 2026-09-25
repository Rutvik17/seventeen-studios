class Solution:
    def minWindow(self, s: str, t: str) -> str:
        need = Counter(t)  # how many more of each character the window still needs
        missing = len(t)  # characters of t not yet covered by the window
        best = (0, 0)  # [start, end) of the smallest window found
        l = 0
        for r, c in enumerate(s):
            if need[c] > 0:
                missing -= 1
            need[c] -= 1
            while missing == 0:  # the window covers t: shrink it from the left
                if best == (0, 0) or r + 1 - l < best[1] - best[0]:
                    best = (l, r + 1)
                need[s[l]] += 1
                if need[s[l]] > 0:
                    missing += 1
                l += 1
        return s[best[0] : best[1]]
