class Solution {
public:
    int largestRectangleArea(vector<int>& heights) {
        vector<pair<int, int>> stack; // {start index, height}; heights increase upward
        int best = 0, n = heights.size();
        for (int i = 0; i <= n; i++) {
            int h = i == n ? 0 : heights[i]; // a final 0 flushes the stack
            int start = i;
            while (!stack.empty() && stack.back().second >= h) {
                auto [j, hj] = stack.back();
                stack.pop_back();
                best = max(best, hj * (i - j)); // hj could stretch from j up to i
                start = j; // the new bar can reach back as far
            }
            stack.push_back({start, h});
        }
        return best;
    }
};
