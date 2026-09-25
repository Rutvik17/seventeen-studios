public class Solution {
    public int MinCostConnectPoints(int[][] points) {
        // Prim's algorithm on the complete graph: grow one tree from point 0, always
        // adding the outside point that is cheapest to connect to it.
        int n = points.Length, total = 0;
        var cost = new int[n]; // cheapest link from each outside point to the tree
        Array.Fill(cost, int.MaxValue);
        cost[0] = 0;
        var inside = new bool[n];
        for (int k = 0; k < n; k++) {
            int u = -1;
            for (int i = 0; i < n; i++) if (!inside[i] && (u < 0 || cost[i] < cost[u])) u = i;
            inside[u] = true;
            total += cost[u];
            for (int v = 0; v < n; v++) // u may offer a cheaper link to the points still outside
                if (!inside[v]) cost[v] = Math.Min(cost[v], Math.Abs(points[u][0] - points[v][0]) + Math.Abs(points[u][1] - points[v][1]));
        }
        return total;
    }
}
