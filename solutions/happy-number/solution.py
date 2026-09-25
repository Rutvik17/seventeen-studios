class Solution:
    def isHappy(self, n: int) -> bool:
        def step(x):  # the sum of the squares of x's digits
            total = 0
            while x:
                x, d = divmod(x, 10)
                total += d * d
            return total

        # The numbers either reach 1 or fall into a loop. Floyd's tortoise and hare finds out
        # without remembering them: fast moves two steps for each one of slow.
        slow, fast = n, step(n)
        while fast != 1 and slow != fast:
            slow, fast = step(slow), step(step(fast))
        return fast == 1
