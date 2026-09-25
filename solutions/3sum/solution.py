class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        nums.sort()
        out = []
        for i in range(len(nums) - 2):
            if nums[i] > 0:
                break  # the smallest of the three is positive: no more zero sums
            if i > 0 and nums[i] == nums[i - 1]:
                continue  # same first number as before: same triplets
            l, r = i + 1, len(nums) - 1
            while l < r:
                total = nums[i] + nums[l] + nums[r]
                if total < 0:
                    l += 1
                elif total > 0:
                    r -= 1
                else:
                    out.append([nums[i], nums[l], nums[r]])
                    l += 1
                    while l < r and nums[l] == nums[l - 1]:
                        l += 1  # skip repeats of the middle number
        return out
