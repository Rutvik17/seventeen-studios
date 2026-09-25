public class Solution {
    public int MaxArea(int[] height) {
        int l = 0, r = height.Length - 1, best = 0;
        while (l < r) {
            best = Math.Max(best, (r - l) * Math.Min(height[l], height[r]));
            // The shorter wall limits the water; moving the taller one in can only lose.
            if (height[l] < height[r]) l++;
            else r--;
        }
        return best;
    }
}
