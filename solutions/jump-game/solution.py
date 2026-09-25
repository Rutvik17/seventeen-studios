class Solution:
    def canJump(self, nums: List[int]) -> bool:
        reach = 0  # the furthest index reachable so far
        for i, x in enumerate(nums):
            if i > reach:
                return False  # a gap nothing can jump across
            reach = max(reach, i + x)
        return True
