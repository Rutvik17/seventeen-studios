public class Solution {
    private readonly IList<IList<int>> out_ = new List<IList<int>>();
    private readonly List<int> cur = new();

    public IList<IList<int>> CombinationSum2(int[] candidates, int target) {
        Array.Sort(candidates); // equal values side by side, and too big means every later one is too
        Pick(candidates, 0, target);
        return out_;
    }

    private void Pick(int[] c, int start, int left) {
        if (left == 0) {
            out_.Add(new List<int>(cur));
            return;
        }
        for (int i = start; i < c.Length && c[i] <= left; i++) {
            if (i > start && c[i] == c[i - 1]) continue; // the same value in the same place would repeat a combination
            cur.Add(c[i]);
            Pick(c, i + 1, left - c[i]); // each candidate used at most once
            cur.RemoveAt(cur.Count - 1);
        }
    }
}
