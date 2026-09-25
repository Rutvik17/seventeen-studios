class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        # A triplet with any value above the target's can never be used: merging only raises.
        # Merge every other one; the target is reachable exactly when each position is hit.
        got = [False, False, False]
        for t in triplets:
            if all(t[i] <= target[i] for i in range(3)):
                for i in range(3):
                    if t[i] == target[i]:
                        got[i] = True
        return all(got)
