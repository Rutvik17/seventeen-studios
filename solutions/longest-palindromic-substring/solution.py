class Solution:
    def longestPalindrome(self, s: str) -> str:
        # Manacher's algorithm. Put "#" between the letters so every palindrome has a middle:
        # "abba" becomes "#a#b#b#a#". p[i] is how far the palindrome centred at i reaches.
        t = "#" + "#".join(s) + "#"
        n = len(t)
        p = [0] * n
        center = right = 0  # the palindrome reaching furthest right so far
        for i in range(n):
            if i < right:
                p[i] = min(right - i, p[2 * center - i])  # its mirror image already knows this much
            while i - p[i] - 1 >= 0 and i + p[i] + 1 < n and t[i - p[i] - 1] == t[i + p[i] + 1]:
                p[i] += 1
            if i + p[i] > right:
                center, right = i, i + p[i]
        i = max(range(n), key=lambda k: p[k])
        start = (i - p[i]) // 2  # back from "#" positions to positions in s
        return s[start : start + p[i]]
