class Solution {
    public int networkDelayTime(int[][] times, int n, int k) {
        List<List<int[]>> outOf = new ArrayList<>();
        for (int i = 0; i <= n; i++) outOf.add(new ArrayList<>());
        for (int[] t : times) outOf.get(t[0]).add(new int[] {t[1], t[2]});
        // Dijkstra: always settle the unsettled node the signal reaches soonest.
        int[] arrive = new int[n + 1];
        Arrays.fill(arrive, -1);
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        heap.add(new int[] {0, k});
        int settled = 0, last = 0;
        while (!heap.isEmpty()) {
            int[] e = heap.poll();
            int t = e[0], u = e[1];
            if (arrive[u] >= 0) continue; // settled already, by a quicker route
            arrive[u] = t;
            settled++;
            last = t;
            for (int[] vw : outOf.get(u)) if (arrive[vw[0]] < 0) heap.add(new int[] {t + vw[1], vw[0]});
        }
        return settled == n ? last : -1;
    }
}
