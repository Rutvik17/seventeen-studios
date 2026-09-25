class Solution {
    private int[] parent, size;

    public int countComponents(int n, int[][] edges) {
        // Union-find: start with n groups; every edge that joins two groups makes one fewer.
        parent = new int[n];
        size = new int[n];
        for (int i = 0; i < n; i++) {
            parent[i] = i;
            size[i] = 1;
        }
        int groups = n;
        for (int[] e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra == rb) continue; // already in one group
            if (size[ra] < size[rb]) {
                int t = ra;
                ra = rb;
                rb = t;
            }
            parent[rb] = ra;
            size[ra] += size[rb];
            groups--;
        }
        return groups;
    }

    private int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]]; // halve the path as we go
            x = parent[x];
        }
        return x;
    }
}
