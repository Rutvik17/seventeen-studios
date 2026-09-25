class Solution:
    def countSubstrings(self, s: str) -> int:
        # Manacher's algorithm (see Longest Palindromic Substring): p[i] is the reach of the
        # longest palindrome centred at i in "#a#b#...#". Every shorter one with the same
        # centre is a palindrome too, and there are (p[i] + 1) // 2 of them in s.
        t = "#" + "#".join(s) + "#"
        n = len(t)
        p = [0] * n
        center = right = 0
        for i in range(n):
            if i < right:
                p[i] = min(right - i, p[2 * center - i])
            while i - p[i] - 1 >= 0 and i + p[i] + 1 < n and t[i - p[i] - 1] == t[i + p[i] + 1]:
                p[i] += 1
            if i + p[i] > right:
                center, right = i, i + p[i]
        return sum((r + 1) // 2 for r in p)
