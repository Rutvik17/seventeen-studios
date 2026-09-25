class Solution {
    public int missingNumber(int[] nums) {
        // XOR every index 0..n and every value: each number present cancels with its index,
        // leaving only the one that is missing.
        int out = nums.length;
        for (int i = 0; i < nums.length; i++) out ^= i ^ nums[i];
        return out;
    }
}
