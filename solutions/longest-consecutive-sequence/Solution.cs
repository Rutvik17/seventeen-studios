public class Solution {
    public int LongestConsecutive(int[] nums) {
        var have = new HashSet<int>(nums);
        int best = 0;
        foreach (int x in have) {
            if (have.Contains(x - 1)) continue; // not the start of a run
            int length = 1;
            while (have.Contains(x + length)) length++;
            best = Math.Max(best, length);
        }
        return best;
    }
}
