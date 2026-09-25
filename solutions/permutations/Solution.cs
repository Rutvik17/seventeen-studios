public class Solution {
    private readonly IList<IList<int>> out_ = new List<IList<int>>();

    public IList<IList<int>> Permute(int[] nums) {
        Place(nums, 0);
        return out_;
    }

    // Positions before k are fixed; choose what goes at k.
    private void Place(int[] nums, int k) {
        if (k == nums.Length) {
            out_.Add(new List<int>(nums));
            return;
        }
        for (int i = k; i < nums.Length; i++) {
            (nums[k], nums[i]) = (nums[i], nums[k]); // bring nums[i] to position k
            Place(nums, k + 1);
            (nums[k], nums[i]) = (nums[i], nums[k]); // and put it back
        }
    }
}
