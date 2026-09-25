class Solution:
    def reverse(self, x: int) -> int:
        LIMIT = 2**31 - 1
        sign = -1 if x < 0 else 1
        x, out = abs(x), 0
        while x:
            x, d = divmod(x, 10)
            # Check before growing: out * 10 + d must stay within 32 bits.
            if out > (LIMIT - d) // 10:
                return 0
            out = out * 10 + d
        return sign * out
