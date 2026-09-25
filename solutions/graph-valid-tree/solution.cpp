class Solution {
    vector<int> parent;

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]]; // halve the path as we go
            x = parent[x];
        }
        return x;
    }
public:
    bool validTree(int n, vector<vector<int>>& edges) {
        // A tree on n nodes has exactly n - 1 edges and no cycle; together those mean connected.
        if ((int)edges.size() != n - 1) return false;
        parent.resize(n);
        iota(parent.begin(), parent.end(), 0);
        for (auto& e : edges) {
            int ra = find(e[0]), rb = find(e[1]);
            if (ra == rb) return false; // already joined: this edge makes a cycle
            parent[ra] = rb;
        }
        return true;
    }
};
