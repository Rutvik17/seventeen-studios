class Solution {
    public int[] twoSum(int[] numbers, int target) {
        int l = 0, r = numbers.length - 1;
        while (l < r) {
            int total = numbers[l] + numbers[r];
            if (total == target) return new int[] { l + 1, r + 1 }; // 1-indexed
            if (total < target) l++; // need a bigger sum
            else r--; // need a smaller sum
        }
        return new int[0];
    }
}
