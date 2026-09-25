class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        # Track the largest and the smallest product of a run ending here: a negative number
        # turns the smallest (most negative) into the largest.
        hi = lo = best = nums[0]
        for x in nums[1:]:
            hi, lo = max(x, hi * x, lo * x), min(x, hi * x, lo * x)
            best = max(best, hi)
        return best
