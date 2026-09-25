class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        # Quickselect: the k-th largest is the one that would sit at index n - k if sorted.
        target = len(nums) - k
        lo, hi = 0, len(nums) - 1
        while True:
            pivot = nums[random.randint(lo, hi)]  # a random pivot defeats adversarial inputs
            # Three-way partition of lo..hi: < pivot, then == pivot, then > pivot.
            lt, i, gt = lo, lo, hi
            while i <= gt:
                if nums[i] < pivot:
                    nums[lt], nums[i] = nums[i], nums[lt]
                    lt += 1
                    i += 1
                elif nums[i] > pivot:
                    nums[gt], nums[i] = nums[i], nums[gt]
                    gt -= 1
                else:
                    i += 1
            if target < lt:
                hi = lt - 1  # it is among the smaller ones
            elif target > gt:
                lo = gt + 1  # among the larger ones
            else:
                return pivot  # it lands in the block equal to the pivot
