class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : nums) count.merge(x, 1, Integer::sum);
        // buckets[f] holds every number that appears exactly f times.
        List<Integer>[] buckets = new List[nums.length + 1];
        for (var e : count.entrySet()) {
            int f = e.getValue();
            if (buckets[f] == null) buckets[f] = new ArrayList<>();
            buckets[f].add(e.getKey());
        }
        int[] out = new int[k];
        int n = 0;
        for (int f = nums.length; f > 0 && n < k; f--) {
            if (buckets[f] == null) continue;
            for (int x : buckets[f]) {
                out[n++] = x;
                if (n == k) break;
            }
        }
        return out;
    }
}
