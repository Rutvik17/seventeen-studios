class Solution {
    private int[] parent, size;

    public int[] findRedundantConnection(int[][] edges) {
        // Union-find: each node points toward a representative of its connected group.
        parent = new int[edges.length + 1];
        size = new int[edges.length + 1];
        for (int i = 0; i < parent.length; i++) {
            parent[i] = i;
            size[i] = 1;
        }
        for (int[] e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra == rb) return e; // already connected: this edge closes a cycle
            if (size[ra] < size[rb]) {
                int t = ra;
                ra = rb;
                rb = t;
            }
            parent[rb] = ra; // hang the smaller group under the larger
            size[ra] += size[rb];
        }
        return new int[0];
    }

    private int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]]; // halve the path as we go
            x = parent[x];
        }
        return x;
    }
}
