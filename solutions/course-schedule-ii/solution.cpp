class Solution {
public:
    vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {
        // Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
        vector<vector<int>> after(numCourses); // course -> the courses that need it
        vector<int> need(numCourses, 0); // course -> how many prerequisites it still waits for
        for (auto& p : prerequisites) {
            after[p[1]].push_back(p[0]);
            need[p[0]]++;
        }
        vector<int> order;
        for (int c = 0; c < numCourses; c++) if (need[c] == 0) order.push_back(c);
        for (size_t h = 0; h < order.size(); h++)
            for (int next : after[order[h]]) if (--need[next] == 0) order.push_back(next);
        if ((int)order.size() < numCourses) return {}; // short means a cycle
        return order;
    }
};
