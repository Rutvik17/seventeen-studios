public class Solution {
    private readonly IList<IList<int>> out_ = new List<IList<int>>();
    private readonly List<int> cur = new();

    public IList<IList<int>> CombinationSum(int[] candidates, int target) {
        Array.Sort(candidates); // so a candidate too big means every later one is too
        Pick(candidates, 0, target);
        return out_;
    }

    // Add candidates from index start on; left: what is still needed.
    private void Pick(int[] c, int start, int left) {
        if (left == 0) {
            out_.Add(new List<int>(cur));
            return;
        }
        for (int i = start; i < c.Length && c[i] <= left; i++) {
            cur.Add(c[i]);
            Pick(c, i, left - c[i]); // i, not i + 1: the same number may be used again
            cur.RemoveAt(cur.Count - 1);
        }
    }
}
