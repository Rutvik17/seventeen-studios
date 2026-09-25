public class Solution {
    public bool ContainsDuplicate(int[] nums) {
        var seen = new HashSet<int>();
        foreach (int x in nums) {
            if (!seen.Add(x)) return true; // Add is false when x was already there
        }
        return false;
    }
}
