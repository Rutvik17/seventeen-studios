class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        a, b = (nums1, nums2) if len(nums1) <= len(nums2) else (nums2, nums1)  # search the shorter
        m, n = len(a), len(b)
        half = (m + n + 1) // 2  # how many elements belong on the left
        lo, hi = 0, m
        while True:
            i = (lo + hi) // 2  # take i from a and half - i from b for the left side
            j = half - i
            a_left = a[i - 1] if i > 0 else float("-inf")
            a_right = a[i] if i < m else float("inf")
            b_left = b[j - 1] if j > 0 else float("-inf")
            b_right = b[j] if j < n else float("inf")
            if a_left <= b_right and b_left <= a_right:  # everything left <= everything right
                if (m + n) % 2:
                    return float(max(a_left, b_left))
                return (max(a_left, b_left) + min(a_right, b_right)) / 2
            if a_left > b_right:
                hi = i - 1  # took too many from a
            else:
                lo = i + 1  # took too few from a
