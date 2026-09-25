public class Solution {
    public int FindCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        // Bellman-Ford, stopped after k + 1 rounds: after round r, cost[v] is the cheapest
        // way to v using at most r flights (at most r - 1 stops).
        const int INF = int.MaxValue;
        var cost = new int[n];
        Array.Fill(cost, INF);
        cost[src] = 0;
        for (int r = 0; r <= k; r++) {
            var before = (int[])cost.Clone(); // read last round's costs, so one round adds only one flight
            foreach (var f in flights)
                if (before[f[0]] != INF && before[f[0]] + f[2] < cost[f[1]]) cost[f[1]] = before[f[0]] + f[2];
        }
        return cost[dst] == INF ? -1 : cost[dst];
    }
}
