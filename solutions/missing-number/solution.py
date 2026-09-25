class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        # XOR every index 0..n and every value: each number present cancels with its index,
        # leaving only the one that is missing.
        out = len(nums)
        for i, x in enumerate(nums):
            out ^= i ^ x
        return out
