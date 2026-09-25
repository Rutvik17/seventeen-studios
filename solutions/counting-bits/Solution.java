class Solution {
    public int[] countBits(int n) {
        // i >> 1 is i without its last bit, and already counted; add that last bit back.
        int[] ones = new int[n + 1];
        for (int i = 1; i <= n; i++) ones[i] = ones[i >> 1] + (i & 1);
        return ones;
    }
}
