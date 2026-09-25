class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        // Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
        vector<vector<int>> after(numCourses); // course -> the courses that need it
        vector<int> need(numCourses, 0); // course -> how many prerequisites it still waits for
        for (auto& p : prerequisites) {
            after[p[1]].push_back(p[0]);
            need[p[0]]++;
        }
        queue<int> ready;
        for (int c = 0; c < numCourses; c++) if (need[c] == 0) ready.push(c);
        int taken = 0;
        while (!ready.empty()) {
            int c = ready.front();
            ready.pop();
            taken++;
            for (int next : after[c]) if (--need[next] == 0) ready.push(next);
        }
        return taken == numCourses; // any course never taken is on a cycle
    }
};
