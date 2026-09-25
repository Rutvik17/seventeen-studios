class DetectSquares {
    unordered_map<int, unordered_map<int, int>> col; // x -> {y -> points added there}

    int at(int x, int y) {
        auto c = col.find(x);
        if (c == col.end()) return 0;
        auto v = c->second.find(y);
        return v == c->second.end() ? 0 : v->second;
    }
public:
    DetectSquares() {}

    void add(vector<int> point) {
        col[point[0]][point[1]]++;
    }

    int count(vector<int> point) {
        int x = point[0], y = point[1], total = 0;
        auto same = col.find(x);
        if (same == col.end()) return 0;
        // A point straight above or below the query fixes the side length d; the square then
        // lies to the right or to the left, and needs its other two corners.
        for (auto [y2, n] : same->second) {
            int d = y2 - y;
            if (d == 0) continue;
            for (int x2 : {x + d, x - d}) total += n * at(x2, y) * at(x2, y2);
        }
        return total;
    }
};
