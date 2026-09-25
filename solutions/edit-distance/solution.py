class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        # d(i, j): edits turning word1[:i] into word2[:j]. If the last letters match, d(i-1, j-1);
        # otherwise 1 + the cheapest of delete d(i-1, j), insert d(i, j-1), replace d(i-1, j-1).
        row = list(range(len(word2) + 1))  # from the empty word: j inserts
        for i in range(1, len(word1) + 1):
            diag, row[0] = row[0], i  # into the empty word: i deletes
            for j in range(1, len(word2) + 1):
                above = row[j]
                if word1[i - 1] == word2[j - 1]:
                    row[j] = diag
                else:
                    row[j] = 1 + min(above, row[j - 1], diag)
                diag = above
        return row[-1]
