class Solution:
    def partition(self, s: str) -> List[List[str]]:
        n = len(s)
        # pal[i][j]: is s[i..j] a palindrome? Its ends match and its inside is one.
        pal = [[False] * n for _ in range(n)]
        for i in range(n - 1, -1, -1):
            for j in range(i, n):
                pal[i][j] = s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1])
        out, cur = [], []

        def cut(i):  # s[:i] is already cut into palindromes
            if i == n:
                out.append(cur[:])
                return
            for j in range(i, n):
                if pal[i][j]:
                    cur.append(s[i : j + 1])
                    cut(j + 1)
                    cur.pop()

        cut(0)
        return out
