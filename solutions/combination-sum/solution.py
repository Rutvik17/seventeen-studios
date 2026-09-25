class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates.sort()  # so a candidate too big means every later one is too
        out, cur = [], []

        def pick(start, left):  # add candidates from index start on; left: what is still needed
            if left == 0:
                out.append(cur[:])
                return
            for i in range(start, len(candidates)):
                if candidates[i] > left:
                    break
                cur.append(candidates[i])
                pick(i, left - candidates[i])  # i, not i + 1: the same number may be used again
                cur.pop()

        pick(0, target)
        return out
