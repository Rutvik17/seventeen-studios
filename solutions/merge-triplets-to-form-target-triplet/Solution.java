class Solution {
    public boolean mergeTriplets(int[][] triplets, int[] target) {
        // A triplet with any value above the target's can never be used: merging only raises.
        // Merge every other one; the target is reachable exactly when each position is hit.
        boolean[] got = new boolean[3];
        for (int[] t : triplets) {
            if (t[0] > target[0] || t[1] > target[1] || t[2] > target[2]) continue;
            for (int i = 0; i < 3; i++) if (t[i] == target[i]) got[i] = true;
        }
        return got[0] && got[1] && got[2];
    }
}
