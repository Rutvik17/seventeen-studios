class Solution {
    public int singleNumber(int[] nums) {
        // x ^ x = 0 and x ^ 0 = x, and ^ ignores order: every pair cancels, the loner is left.
        int out = 0;
        for (int x : nums) out ^= x;
        return out;
    }
}
