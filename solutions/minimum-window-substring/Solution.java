class Solution {
    public String minWindow(String s, String t) {
        int[] need = new int[128]; // how many more of each character the window needs
        for (char c : t.toCharArray()) need[c]++;
        int missing = t.length(), start = 0, len = Integer.MAX_VALUE;
        for (int l = 0, r = 0; r < s.length(); r++) {
            if (need[s.charAt(r)]-- > 0) missing--;
            while (missing == 0) {
                // The window covers t: record it, then shrink it from the left.
                if (r - l + 1 < len) { start = l; len = r - l + 1; }
                if (++need[s.charAt(l++)] > 0) missing++;
            }
        }
        return len == Integer.MAX_VALUE ? "" : s.substring(start, start + len);
    }
}
