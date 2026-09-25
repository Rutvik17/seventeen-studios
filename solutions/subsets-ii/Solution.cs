public class Solution {
    private readonly IList<IList<int>> out_ = new List<IList<int>>();
    private readonly List<int> cur = new();

    public IList<IList<int>> SubsetsWithDup(int[] nums) {
        Array.Sort(nums); // equal values side by side
        Extend(nums, 0);
        return out_;
    }

    // cur is a subset; try adding each later value to it.
    private void Extend(int[] nums, int start) {
        out_.Add(new List<int>(cur));
        for (int i = start; i < nums.Length; i++) {
            if (i > start && nums[i] == nums[i - 1]) continue; // the same value in the same place would repeat a subset
            cur.Add(nums[i]);
            Extend(nums, i + 1);
            cur.RemoveAt(cur.Count - 1);
        }
    }
}
