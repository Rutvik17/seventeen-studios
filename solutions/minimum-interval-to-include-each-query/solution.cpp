class Solution {
public:
    vector<int> minInterval(vector<vector<int>>& intervals, vector<int>& queries) {
        sort(intervals.begin(), intervals.end());
        vector<int> answer(queries.size(), -1), order(queries.size());
        iota(order.begin(), order.end(), 0);
        // Answer the queries from smallest to largest, so intervals only ever join and leave.
        sort(order.begin(), order.end(), [&](int a, int b) { return queries[a] < queries[b]; });
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> heap; // (size, right end)
        size_t i = 0;
        for (int q : order) {
            int x = queries[q];
            while (i < intervals.size() && intervals[i][0] <= x) { // every interval starting by x
                heap.push({intervals[i][1] - intervals[i][0] + 1, intervals[i][1]});
                i++;
            }
            while (!heap.empty() && heap.top().second < x) heap.pop(); // ended before x: useless now and later
            if (!heap.empty()) answer[q] = heap.top().first; // the smallest interval holding x
        }
        return answer;
    }
};
