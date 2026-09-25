public class Solution {
    public int NetworkDelayTime(int[][] times, int n, int k) {
        var outOf = new List<(int v, int w)>[n + 1];
        for (int i = 0; i <= n; i++) outOf[i] = new();
        foreach (var t in times) outOf[t[0]].Add((t[1], t[2]));
        // Dijkstra: always settle the unsettled node the signal reaches soonest.
        var arrive = new int[n + 1];
        Array.Fill(arrive, -1);
        var heap = new PriorityQueue<(int t, int u), int>();
        heap.Enqueue((0, k), 0);
        int settled = 0, last = 0;
        while (heap.Count > 0) {
            var (t, u) = heap.Dequeue();
            if (arrive[u] >= 0) continue; // settled already, by a quicker route
            arrive[u] = t;
            settled++;
            last = t;
            foreach (var (v, w) in outOf[u]) if (arrive[v] < 0) heap.Enqueue((t + w, v), t + w);
        }
        return settled == n ? last : -1;
    }
}
