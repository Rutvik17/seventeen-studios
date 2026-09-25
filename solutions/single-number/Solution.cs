public class Solution {
    public int SingleNumber(int[] nums) {
        // x ^ x = 0 and x ^ 0 = x, and ^ ignores order: every pair cancels, the loner is left.
        int out_ = 0;
        foreach (int x in nums) out_ ^= x;
        return out_;
    }
}
