class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        out = [0] * len(temperatures)
        stack = []  # days still waiting for a warmer one; their temperatures decrease
        for i, t in enumerate(temperatures):
            while stack and temperatures[stack[-1]] < t:
                j = stack.pop()
                out[j] = i - j  # day i is the first warmer day after day j
            stack.append(i)
        return out
