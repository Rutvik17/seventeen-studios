class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        dq = deque()  # indices whose values decrease from front to back
        out = []
        for i, x in enumerate(nums):
            while dq and nums[dq[-1]] <= x:
                dq.pop()  # smaller values can never be a window's maximum again
            dq.append(i)
            if dq[0] <= i - k:
                dq.popleft()  # the front has slid out of the window
            if i >= k - 1:
                out.append(nums[dq[0]])  # the front is the window's maximum
        return out
