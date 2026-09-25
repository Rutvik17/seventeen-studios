class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        # x ^ x = 0 and x ^ 0 = x, and ^ ignores order: every pair cancels, the loner is left.
        out = 0
        for x in nums:
            out ^= x
        return out
