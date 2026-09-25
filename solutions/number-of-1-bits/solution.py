class Solution:
    def hammingWeight(self, n: int) -> int:
        count = 0
        while n:
            n &= n - 1  # n - 1 flips the lowest 1 bit and the 0s below it: & clears exactly that bit
            count += 1
        return count
