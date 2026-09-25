class Solution:
    def findMin(self, nums: List[int]) -> int:
        lo, hi = 0, len(nums) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if nums[mid] > nums[hi]:
                lo = mid + 1  # the drop is to the right of mid
            else:
                hi = mid  # mid .. hi is sorted, so the minimum is at mid or left of it
        return nums[lo]
