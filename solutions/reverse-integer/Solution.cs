public class Solution {
    public int Reverse(int x) {
        int out_ = 0;
        while (x != 0) {
            int d = x % 10; // keeps x's sign, so negatives reverse into negatives
            x /= 10;
            // Check before growing: out * 10 + d must stay within an int, whose ends are
            // 2147483647 and -2147483648 — so the last digit may be at most 7, or -8.
            if (out_ > int.MaxValue / 10 || (out_ == int.MaxValue / 10 && d > 7)) return 0; // past 2147483647
            if (out_ < int.MinValue / 10 || (out_ == int.MinValue / 10 && d < -8)) return 0; // past -2147483648
            out_ = out_ * 10 + d;
        }
        return out_;
    }
}
