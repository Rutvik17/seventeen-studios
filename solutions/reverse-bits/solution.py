class Solution:
    def reverseBits(self, n: int) -> int:
        out = 0
        for _ in range(32):
            out = (out << 1) | (n & 1)  # take n's lowest bit onto out's low end
            n >>= 1
        return out
