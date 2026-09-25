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
    vector<int> findRedundantConnection(vector<vector<int>>& edges) {
        // Union-find: each node points toward a representative of its connected group.
        parent.resize(edges.size() + 1);
        iota(parent.begin(), parent.end(), 0);
        sz.assign(edges.size() + 1, 1);
        for (auto& e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra == rb) return e; // already connected: this edge closes a cycle
            if (sz[ra] < sz[rb]) swap(ra, rb);
            parent[rb] = ra; // hang the smaller group under the larger
            sz[ra] += sz[rb];
        }
        return {};
    }
};
