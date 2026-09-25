public class Solution {
    public bool CanJump(int[] nums) {
        int reach = 0; // the furthest index reachable so far
        for (int i = 0; i < nums.Length; i++) {
            if (i > reach) return false; // a gap nothing can jump across
            reach = Math.Max(reach, i + nums[i]);
        }
        return true;
    }
}
