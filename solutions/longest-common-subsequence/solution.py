class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        # lcs(i, j) for the first i letters of text1 and j of text2: if the last letters match,
        # 1 + lcs(i - 1, j - 1); otherwise drop one of them, max(lcs(i - 1, j), lcs(i, j - 1)).
        # One row at a time is enough.
        row = [0] * (len(text2) + 1)
        for a in text1:
            diag = 0  # lcs(i - 1, j - 1): the old row's value one to the left
            for j in range(1, len(text2) + 1):
                above = row[j]
                row[j] = diag + 1 if a == text2[j - 1] else max(row[j], row[j - 1])
                diag = above
        return row[-1]
