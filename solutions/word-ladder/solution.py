class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:
        words = set(wordList)
        if endWord not in words:
            return 0
        # Breadth-first: every word reached in round k is k steps from the start, the fewest possible.
        frontier, steps = [beginWord], 1
        words.discard(beginWord)
        while frontier:
            nxt = []
            for w in frontier:
                if w == endWord:
                    return steps
                for i in range(len(w)):
                    for ch in "abcdefghijklmnopqrstuvwxyz":  # every word one letter away
                        cand = w[:i] + ch + w[i + 1 :]
                        if cand in words:
                            words.remove(cand)  # reached now, by the shortest route
                            nxt.append(cand)
            frontier, steps = nxt, steps + 1
        return 0
