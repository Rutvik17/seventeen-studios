class Solution:
    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates.sort()  # equal values side by side, and too big means every later one is too
        out, cur = [], []

        def pick(start, left):
            if left == 0:
                out.append(cur[:])
                return
            for i in range(start, len(candidates)):
                if i > start and candidates[i] == candidates[i - 1]:
                    continue  # the same value in the same place would repeat a combination
                if candidates[i] > left:
                    break
                cur.append(candidates[i])
                pick(i + 1, left - candidates[i])  # each candidate used at most once
                cur.pop()

        pick(0, target)
        return out
