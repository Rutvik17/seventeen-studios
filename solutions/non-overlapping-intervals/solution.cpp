class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& intervals) {
        // Keep as many as possible: always keep the one that ends first — it leaves the most room.
        sort(intervals.begin(), intervals.end(), [](auto& a, auto& b) { return a[1] < b[1]; });
        int kept = 0;
        long long end = LLONG_MIN;
        for (auto& iv : intervals) {
            if (iv[0] >= end) { // fits after the last one kept (touching is fine)
                kept++;
                end = iv[1];
            }
        }
        return intervals.size() - kept;
    }
};
