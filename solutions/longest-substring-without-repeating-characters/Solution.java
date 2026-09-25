class Solution {
    public int lengthOfLongestSubstring(String s) {
        int[] last = new int[128]; // character -> 1 + index where it was last seen (0: never)
        int best = 0;
        for (int l = 0, r = 0; r < s.length(); r++) {
            char c = s.charAt(r);
            l = Math.max(l, last[c]); // jump the window's start past the earlier copy
            last[c] = r + 1;
            best = Math.max(best, r - l + 1);
        }
        return best;
    }
}
