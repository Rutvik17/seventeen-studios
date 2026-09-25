class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        last = {c: i for i, c in enumerate(s)}  # where each letter appears for the last time
        sizes = []
        start = end = 0
        for i, c in enumerate(s):
            end = max(end, last[c])  # this part must reach at least that far
            if i == end:  # every letter seen so far is finished: cut here
                sizes.append(end - start + 1)
                start = i + 1
        return sizes
