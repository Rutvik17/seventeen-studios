class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        n = len(nums)
        out = [1] * n
        prefix = 1  # product of everything to the left of i
        for i in range(n):
            out[i] = prefix
            prefix *= nums[i]
        suffix = 1  # product of everything to the right of i
        for i in range(n - 1, -1, -1):
            out[i] *= suffix
            suffix *= nums[i]
        return out
