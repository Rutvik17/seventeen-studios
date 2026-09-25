public class Solution {
    public int[] TwoSum(int[] numbers, int target) {
        int l = 0, r = numbers.Length - 1;
        while (l < r) {
            int total = numbers[l] + numbers[r];
            if (total == target) return new[] { l + 1, r + 1 }; // 1-indexed
            if (total < target) l++; // need a bigger sum
            else r--; // need a smaller sum
        }
        return Array.Empty<int>();
    }
}
