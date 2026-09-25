public class Solution {
    private int[] parent;

    public bool ValidTree(int n, int[][] edges) {
        // A tree on n nodes has exactly n - 1 edges and no cycle; together those mean connected.
        if (edges.Length != n - 1) return false;
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        foreach (var e in edges) {
            int ra = Find(e[0]), rb = Find(e[1]);
            if (ra == rb) return false; // already joined: this edge makes a cycle
            parent[ra] = rb;
        }
        return true;
    }

    private int Find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]]; // halve the path as we go
            x = parent[x];
        }
        return x;
    }
}
