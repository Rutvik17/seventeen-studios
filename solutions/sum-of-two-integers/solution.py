class Solution:
    def getSum(self, a: int, b: int) -> int:
        # a ^ b adds without carrying; (a & b) << 1 is the carry. Repeat until no carry is left.
        # Python's integers never overflow, so keep them to 32 bits with a mask, as other languages do.
        MASK = 0xFFFFFFFF
        a, b = a & MASK, b & MASK
        while b:
            a, b = (a ^ b) & MASK, ((a & b) << 1) & MASK
        return a if a < 0x80000000 else ~(a ^ MASK)  # read bit 31 as the sign
