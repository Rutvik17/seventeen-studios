class Solution {
    vector<int> parent, sz;

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]]; // halve the path as we go
            x = parent[x];
        }
        return x;
    }
public:
    int countComponents(int n, vector<vector<int>>& edges) {
        // Union-find: start with n groups; every edge that joins two groups makes one fewer.
        parent.resize(n);
        iota(parent.begin(), parent.end(), 0);
        sz.assign(n, 1);
        int groups = n;
        for (auto& e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra == rb) continue; // already in one group
            if (sz[ra] < sz[rb]) swap(ra, rb);
            parent[rb] = ra;
            sz[ra] += sz[rb];
            groups--;
        }
        return groups;
    }
};
