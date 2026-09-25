class Solution:
    def findTargetSumWays(self, nums: List[int], target: int) -> int:
        # Split the numbers into those given + (summing to P) and those given - (summing to N):
        # P - N = target and P + N = total, so P = (total + target) / 2. Count subsets summing to P.
        total = sum(nums)
        if abs(target) > total or (total + target) % 2:
            return 0
        goal = (total + target) // 2
        ways = [1] + [0] * goal  # ways[s]: subsets of the numbers so far that sum to s
        for x in nums:
            for s in range(goal, x - 1, -1):  # downwards, so x is used at most once
                ways[s] += ways[s - x]
        return ways[goal]
