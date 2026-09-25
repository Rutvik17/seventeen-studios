class Solution:
    def rob(self, nums: List[int]) -> int:
        # best(i): the most from houses 0..i. Either skip house i, or rob it and skip i - 1.
        # best(i) = max(best(i - 1), best(i - 2) + nums[i])
        prev2 = prev1 = 0
        for x in nums:
            prev2, prev1 = prev1, max(prev1, prev2 + x)
        return prev1
