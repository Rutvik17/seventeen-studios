class Solution:
    def countBits(self, n: int) -> List[int]:
        # i >> 1 is i without its last bit, and already counted; add that last bit back.
        ones = [0] * (n + 1)
        for i in range(1, n + 1):
            ones[i] = ones[i >> 1] + (i & 1)
        return ones
