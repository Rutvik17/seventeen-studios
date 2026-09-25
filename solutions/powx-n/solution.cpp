class Solution {
public:
    double myPow(double x, int n) {
        long long e = n; // 64 bits, because -(-2^31) does not fit in an int
        if (e < 0) {
            x = 1 / x; // x^-n = (1/x)^n
            e = -e;
        }
        // Square-and-multiply: read n in binary. x, x², x⁴, x⁸… are one squaring apart,
        // and x^n is the product of those whose bit in n is 1.
        double result = 1;
        while (e > 0) {
            if (e & 1) result *= x;
            x *= x;
            e >>= 1;
        }
        return result;
    }
};
