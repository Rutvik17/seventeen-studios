class Solution {
    public int maxArea(int[] height) {
        int l = 0, r = height.length - 1, best = 0;
        while (l < r) {
            best = Math.max(best, (r - l) * Math.min(height[l], height[r]));
            // The shorter wall limits the water; moving the taller one in can only lose.
            if (height[l] < height[r]) l++;
            else r--;
        }
        return best;
    }
}
