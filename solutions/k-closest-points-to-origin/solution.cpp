class Solution {
public:
    vector<vector<int>> kClosest(vector<vector<int>>& points, int k) {
        // A max-heap of the k closest so far, as (squared distance, index). Squared
        // distance x² + y² orders points the same as distance, without a square root.
        priority_queue<pair<int, int>> heap;
        for (int i = 0; i < (int)points.size(); i++) {
            heap.push({points[i][0] * points[i][0] + points[i][1] * points[i][1], i});
            if ((int)heap.size() > k) heap.pop(); // the farthest of k + 1 is not among the closest k
        }
        vector<vector<int>> out;
        for (; !heap.empty(); heap.pop()) out.push_back(points[heap.top().second]);
        return out;
    }
};
