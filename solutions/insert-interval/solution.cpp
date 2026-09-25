class Solution {
public:
    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {
        vector<vector<int>> out;
        int s = newInterval[0], e = newInterval[1];
        size_t i = 0, n = intervals.size();
        while (i < n && intervals[i][1] < s) out.push_back(intervals[i++]); // wholly before the new one: keep as it is
        while (i < n && intervals[i][0] <= e) { // overlapping it: absorb into one interval
            s = min(s, intervals[i][0]);
            e = max(e, intervals[i][1]);
            i++;
        }
        out.push_back({s, e});
        while (i < n) out.push_back(intervals[i++]); // wholly after: keep as they are
        return out;
    }
};
