class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        out, cur = [], []

        def choose(i):  # decide about nums[i], then everything after it
            if i == len(nums):
                out.append(cur[:])
                return
            cur.append(nums[i])  # with nums[i]
            choose(i + 1)
            cur.pop()  # undo, then without it
            choose(i + 1)

        choose(0)
        return out
