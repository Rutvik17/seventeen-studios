class Solution {
    public int longestConsecutive(int[] nums) {
        Set<Integer> have = new HashSet<>();
        for (int x : nums) have.add(x);
        int best = 0;
        for (int x : have) {
            if (have.contains(x - 1)) continue; // not the start of a run
            int length = 1;
            while (have.contains(x + length)) length++;
            best = Math.max(best, length);
        }
        return best;
    }
}
