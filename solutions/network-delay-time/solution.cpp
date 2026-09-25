class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        vector<vector<pair<int, int>>> outOf(n + 1);
        for (auto& t : times) outOf[t[0]].push_back({t[1], t[2]});
        // Dijkstra: always settle the unsettled node the signal reaches soonest.
        vector<int> arrive(n + 1, -1);
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> heap;
        heap.push({0, k});
        int settled = 0, last = 0;
        while (!heap.empty()) {
            auto [t, u] = heap.top();
            heap.pop();
            if (arrive[u] >= 0) continue; // settled already, by a quicker route
            arrive[u] = t;
            settled++;
            last = t;
            for (auto [v, w] : outOf[u]) if (arrive[v] < 0) heap.push({t + w, v});
        }
        return settled == n ? last : -1;
    }
};
