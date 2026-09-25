class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        # Kadane: the best run ending here either extends the one ending just before,
        # or starts afresh — whichever is larger. A negative run so far only drags it down.
        here = best = nums[0]
        for x in nums[1:]:
            here = max(x, here + x)
            best = max(best, here)
        return best
