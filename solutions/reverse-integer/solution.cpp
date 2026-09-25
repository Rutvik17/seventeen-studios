class Solution {
public:
    int reverse(int x) {
        int out = 0;
        while (x != 0) {
            int d = x % 10; // keeps x's sign, so negatives reverse into negatives
            x /= 10;
            // Check before growing: out * 10 + d must stay within an int, whose ends are
            // 2147483647 and -2147483648 — so the last digit may be at most 7, or -8.
            if (out > INT_MAX / 10 || (out == INT_MAX / 10 && d > 7)) return 0; // past 2147483647
            if (out < INT_MIN / 10 || (out == INT_MIN / 10 && d < -8)) return 0; // past -2147483648
            out = out * 10 + d;
        }
        return out;
    }
};
