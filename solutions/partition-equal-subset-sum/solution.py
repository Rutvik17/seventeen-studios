class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False  # an odd total cannot split into two equal halves
        half = total // 2
        # can[s]: can some of the numbers seen so far add up to s?
        can = [True] + [False] * half
        for x in nums:
            for s in range(half, x - 1, -1):  # downwards, so x is used at most once
                can[s] = can[s] or can[s - x]
            if can[half]:
                return True
        return can[half]
