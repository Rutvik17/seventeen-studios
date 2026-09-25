public class Solution {
    public int MissingNumber(int[] nums) {
        // XOR every index 0..n and every value: each number present cancels with its index,
        // leaving only the one that is missing.
        int out_ = nums.Length;
        for (int i = 0; i < nums.Length; i++) out_ ^= i ^ nums[i];
        return out_;
    }
}
