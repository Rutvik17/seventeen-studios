public class Solution {
    private int[] parent, size;

    public int CountComponents(int n, int[][] edges) {
        // Union-find: start with n groups; every edge that joins two groups makes one fewer.
        parent = new int[n];
        size = new int[n];
        for (int i = 0; i < n; i++) {
            parent[i] = i;
            size[i] = 1;
        }
        int groups = n;
        foreach (var e in edges) {
            int ra = Find(e[0]), rb = Find(e[1]);
            if (ra == rb) continue; // already in one group
            if (size[ra] < size[rb]) (ra, rb) = (rb, ra);
            parent[rb] = ra;
            size[ra] += size[rb];
            groups--;
        }
        return groups;
    }

    private int Find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]]; // halve the path as we go
            x = parent[x];
        }
        return x;
    }
}
