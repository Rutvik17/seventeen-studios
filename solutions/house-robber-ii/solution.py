class Solution:
    def rob(self, nums: List[int]) -> int:
        # The first and last houses touch, so at most one of them is robbed: solve the street
        # without the last house and the street without the first, and take the better.
        def line(houses):
            prev2 = prev1 = 0
            for x in houses:
                prev2, prev1 = prev1, max(prev1, prev2 + x)
            return prev1

        if len(nums) == 1:
            return nums[0]
        return max(line(nums[:-1]), line(nums[1:]))
