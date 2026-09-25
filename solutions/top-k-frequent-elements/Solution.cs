public class Solution {
    public int[] TopKFrequent(int[] nums, int k) {
        var count = new Dictionary<int, int>();
        foreach (int x in nums) count[x] = count.GetValueOrDefault(x) + 1;
        // buckets[f] holds every number that appears exactly f times.
        var buckets = new List<int>[nums.Length + 1];
        foreach (var (x, f) in count) (buckets[f] ??= new List<int>()).Add(x);
        var output = new List<int>(k);
        for (int f = nums.Length; f > 0 && output.Count < k; f--) {
            if (buckets[f] == null) continue;
            foreach (int x in buckets[f]) {
                output.Add(x);
                if (output.Count == k) break;
            }
        }
        return output.ToArray();
    }
}
