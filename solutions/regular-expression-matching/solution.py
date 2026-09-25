class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        m, n = len(s), len(p)
        # match[i][j]: does s[i:] match p[j:]? Filled from the ends back to the start.
        match = [[False] * (n + 1) for _ in range(m + 1)]
        match[m][n] = True  # nothing matches nothing
        for i in range(m, -1, -1):
            for j in range(n - 1, -1, -1):
                first = i < m and p[j] in (s[i], ".")  # does s[i] match the pattern's next letter?
                if j + 1 < n and p[j + 1] == "*":
                    # "x*": use it zero times (skip it), or match one letter and stay on it
                    match[i][j] = match[i][j + 2] or (first and match[i + 1][j])
                else:
                    match[i][j] = first and match[i + 1][j + 1]
        return match[0][0]
