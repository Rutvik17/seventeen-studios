public class Solution {
    public int[] TwoSum(int[] nums, int target) {
        var seen = new Dictionary<int, int>(); // value -> index
        for (int i = 0; i < nums.Length; i++) {
            int need = target - nums[i];
            if (seen.TryGetValue(need, out int j)) return new[] { j, i };
            seen[nums[i]] = i;
        }
        return Array.Empty<int>();
    }
}
