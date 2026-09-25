public class Solution {
    public bool CanPartition(int[] nums) {
        int total = nums.Sum();
        if (total % 2 != 0) return false; // an odd total cannot split into two equal halves
        int half = total / 2;
        // can[s]: can some of the numbers seen so far add up to s?
        var can = new bool[half + 1];
        can[0] = true;
        foreach (int x in nums) {
            for (int s = half; s >= x; s--) can[s] = can[s] || can[s - x]; // downwards, so x is used at most once
            if (can[half]) return true;
        }
        return can[half];
    }
}
