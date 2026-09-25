public class Solution {
    public int Trap(int[] height) {
        int l = 0, r = height.Length - 1, leftMax = 0, rightMax = 0, water = 0;
        while (l < r) {
            // The lower side decides: its level is its own tallest wall so far,
            // because the other side is known to have a taller one.
            if (height[l] < height[r]) {
                leftMax = Math.Max(leftMax, height[l]);
                water += leftMax - height[l++];
            } else {
                rightMax = Math.Max(rightMax, height[r]);
                water += rightMax - height[r--];
            }
        }
        return water;
    }
}
