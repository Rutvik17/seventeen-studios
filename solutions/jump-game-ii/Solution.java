class Solution {
    public int jump(int[] nums) {
        // Breadth-first in disguise: indices reachable in `jumps` jumps form a window ending
        // at `end`; scanning it finds how far one more jump can reach (`far`).
        int jumps = 0, end = 0, far = 0;
        for (int i = 0; i < nums.length - 1; i++) {
            far = Math.max(far, i + nums[i]);
            if (i == end) { // the window is used up: jump once more
                jumps++;
                end = far;
            }
        }
        return jumps;
    }
}
