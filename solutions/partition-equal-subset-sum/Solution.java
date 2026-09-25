class Solution {
    public boolean canPartition(int[] nums) {
        int total = 0;
        for (int x : nums) total += x;
        if (total % 2 != 0) return false; // an odd total cannot split into two equal halves
        int half = total / 2;
        // can[s]: can some of the numbers seen so far add up to s?
        boolean[] can = new boolean[half + 1];
        can[0] = true;
        for (int x : nums) {
            for (int s = half; s >= x; s--) can[s] = can[s] || can[s - x]; // downwards, so x is used at most once
            if (can[half]) return true;
        }
        return can[half];
    }
}
