class Solution {
    public int minCostConnectPoints(int[][] points) {
        // Prim's algorithm on the complete graph: grow one tree from point 0, always
        // adding the outside point that is cheapest to connect to it.
        int n = points.length, total = 0;
        int[] cost = new int[n]; // cheapest link from each outside point to the tree
        Arrays.fill(cost, Integer.MAX_VALUE);
        cost[0] = 0;
        boolean[] inside = new boolean[n];
        for (int k = 0; k < n; k++) {
            int u = -1;
            for (int i = 0; i < n; i++) if (!inside[i] && (u < 0 || cost[i] < cost[u])) u = i;
            inside[u] = true;
            total += cost[u];
            for (int v = 0; v < n; v++) // u may offer a cheaper link to the points still outside
                if (!inside[v]) cost[v] = Math.min(cost[v], Math.abs(points[u][0] - points[v][0]) + Math.abs(points[u][1] - points[v][1]));
        }
        return total;
    }
}
