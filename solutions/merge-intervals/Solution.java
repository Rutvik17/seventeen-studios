class Solution {
    public int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0])); // by start: overlapping intervals are now next to each other
        List<int[]> out = new ArrayList<>();
        for (int[] iv : intervals) {
            if (!out.isEmpty() && iv[0] <= out.get(out.size() - 1)[1]) {
                int[] last = out.get(out.size() - 1);
                last[1] = Math.max(last[1], iv[1]); // overlaps the last one: stretch it
            } else out.add(new int[] {iv[0], iv[1]});
        }
        return out.toArray(new int[0][]);
    }
}
