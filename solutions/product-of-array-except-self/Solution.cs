public class Solution {
    public int[] ProductExceptSelf(int[] nums) {
        int n = nums.Length;
        var output = new int[n];
        int prefix = 1; // product of everything to the left of i
        for (int i = 0; i < n; i++) {
            output[i] = prefix;
            prefix *= nums[i];
        }
        int suffix = 1; // product of everything to the right of i
        for (int i = n - 1; i >= 0; i--) {
            output[i] *= suffix;
            suffix *= nums[i];
        }
        return output;
    }
}
