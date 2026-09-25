public class Solution {
    private readonly IList<IList<int>> out_ = new List<IList<int>>();
    private readonly List<int> cur = new();

    public IList<IList<int>> Subsets(int[] nums) {
        Choose(nums, 0);
        return out_;
    }

    // Decide about nums[i], then everything after it.
    private void Choose(int[] nums, int i) {
        if (i == nums.Length) {
            out_.Add(new List<int>(cur));
            return;
        }
        cur.Add(nums[i]); // with nums[i]
        Choose(nums, i + 1);
        cur.RemoveAt(cur.Count - 1); // undo, then without it
        Choose(nums, i + 1);
    }
}
