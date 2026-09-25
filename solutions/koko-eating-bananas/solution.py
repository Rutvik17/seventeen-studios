class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        def hours(k: int) -> int:
            return sum((p + k - 1) // k for p in piles)  # each pile takes ceil(p / k) hours

        lo, hi = 1, max(piles)  # at max(piles) every pile takes one hour
        while lo < hi:
            mid = (lo + hi) // 2
            if hours(mid) <= h:
                hi = mid  # fast enough: maybe slower still works
            else:
                lo = mid + 1  # too slow
        return lo
