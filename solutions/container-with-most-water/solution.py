class Solution:
    def maxArea(self, height: List[int]) -> int:
        l, r = 0, len(height) - 1
        best = 0
        while l < r:
            best = max(best, (r - l) * min(height[l], height[r]))
            # The shorter wall limits the water; moving the taller one in can only lose.
            if height[l] < height[r]:
                l += 1
            else:
                r -= 1
        return best
