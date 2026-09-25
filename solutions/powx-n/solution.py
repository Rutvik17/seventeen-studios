class Solution:
    def myPow(self, x: float, n: int) -> float:
        if n < 0:
            x, n = 1 / x, -n  # x^-n = (1/x)^n
        # Square-and-multiply: read n in binary. x, x², x⁴, x⁸… are one squaring apart,
        # and x^n is the product of those whose bit in n is 1.
        result = 1.0
        while n:
            if n & 1:
                result *= x
            x *= x
            n >>= 1
        return result
