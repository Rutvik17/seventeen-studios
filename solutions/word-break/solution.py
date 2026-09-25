class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        words = set(wordDict)
        longest = max(map(len, words))
        # ok[i]: can s[:i] be split into words? It can if some word ends at i and
        # the part before that word can be split too.
        ok = [True] + [False] * len(s)
        for i in range(1, len(s) + 1):
            for j in range(max(0, i - longest), i):  # no word is longer than `longest`
                if ok[j] and s[j:i] in words:
                    ok[i] = True
                    break
        return ok[len(s)]
