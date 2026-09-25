class Solution {
    public int[] minInterval(int[][] intervals, int[] queries) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        int[] answer = new int[queries.length];
        Arrays.fill(answer, -1);
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0])); // {size, right end}
        Integer[] order = new Integer[queries.length];
        for (int k = 0; k < order.length; k++) order[k] = k;
        // Answer the queries from smallest to largest, so intervals only ever join and leave.
        Arrays.sort(order, (a, b) -> Integer.compare(queries[a], queries[b]));
        int i = 0;
        for (int q : order) {
            int x = queries[q];
            while (i < intervals.length && intervals[i][0] <= x) { // every interval starting by x
                heap.add(new int[] {intervals[i][1] - intervals[i][0] + 1, intervals[i][1]});
                i++;
            }
            while (!heap.isEmpty() && heap.peek()[1] < x) heap.poll(); // ended before x: useless now and later
            if (!heap.isEmpty()) answer[q] = heap.peek()[0]; // the smallest interval holding x
        }
        return answer;
    }
}
