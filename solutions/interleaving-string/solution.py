class Solution:
    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:
        if len(s1) + len(s2) != len(s3):
            return False
        # ok[j] (in row i): can s1[:i] and s2[:j] interleave into s3[:i + j]? The last letter
        # of s3[:i + j] came from s1 or from s2.
        ok = [False] * (len(s2) + 1)
        for i in range(len(s1) + 1):
            for j in range(len(s2) + 1):
                if i == 0 and j == 0:
                    ok[j] = True
                else:
                    k = i + j - 1
                    from1 = i > 0 and ok[j] and s1[i - 1] == s3[k]  # ok[j] still holds row i - 1
                    from2 = j > 0 and ok[j - 1] and s2[j - 1] == s3[k]
                    ok[j] = from1 or from2
        return ok[len(s2)]
