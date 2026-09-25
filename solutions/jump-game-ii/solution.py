class Solution:
    def jump(self, nums: List[int]) -> int:
        # Breadth-first in disguise: indices reachable in `jumps` jumps form a window ending
        # at `end`; scanning it finds how far one more jump can reach (`far`).
        jumps = end = far = 0
        for i in range(len(nums) - 1):
            far = max(far, i + nums[i])
            if i == end:  # the window is used up: jump once more
                jumps += 1
                end = far
        return jumps
