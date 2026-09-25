public class Solution {
    public IList<IList<int>> ThreeSum(int[] nums) {
        Array.Sort(nums);
        var output = new List<IList<int>>();
        for (int i = 0; i < nums.Length - 2; i++) {
            if (nums[i] > 0) break; // the smallest of the three is positive
            if (i > 0 && nums[i] == nums[i - 1]) continue; // same first number: same triplets
            int l = i + 1, r = nums.Length - 1;
            while (l < r) {
                int total = nums[i] + nums[l] + nums[r];
                if (total < 0) l++;
                else if (total > 0) r--;
                else {
                    output.Add(new List<int> { nums[i], nums[l], nums[r] });
                    l++;
                    while (l < r && nums[l] == nums[l - 1]) l++; // skip repeats of the middle number
                }
            }
        }
        return output;
    }
}
