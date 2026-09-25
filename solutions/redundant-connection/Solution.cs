public class Solution {
    private int[] parent, size;

    public int[] FindRedundantConnection(int[][] edges) {
        // Union-find: each node points toward a representative of its connected group.
        parent = new int[edges.Length + 1];
        size = new int[edges.Length + 1];
        for (int i = 0; i < parent.Length; i++) {
            parent[i] = i;
            size[i] = 1;
        }
        foreach (var e in edges) {
            int ra = Find(e[0]), rb = Find(e[1]);
            if (ra == rb) return e; // already connected: this edge closes a cycle
            if (size[ra] < size[rb]) (ra, rb) = (rb, ra);
            parent[rb] = ra; // hang the smaller group under the larger
            size[ra] += size[rb];
        }
        return new int[0];
    }

    private int Find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]]; // halve the path as we go
            x = parent[x];
        }
        return x;
    }
}
