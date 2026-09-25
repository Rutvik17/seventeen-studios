class Solution {
public:
    void wallsAndGates(vector<vector<int>>& rooms) {
        const int INF = INT_MAX; // an empty room not yet reached
        int rows = rooms.size(), cols = rooms[0].size();
        // Breadth-first from every gate at once: a room is first reached from its nearest gate.
        queue<pair<int, int>> q;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                if (rooms[r][c] == 0) q.push({r, c});
        int moves[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!q.empty()) {
            auto [i, j] = q.front();
            q.pop();
            for (auto& m : moves) {
                int x = i + m[0], y = j + m[1];
                if (x >= 0 && x < rows && y >= 0 && y < cols && rooms[x][y] == INF) {
                    rooms[x][y] = rooms[i][j] + 1;
                    q.push({x, y});
                }
            }
        }
    }
};
