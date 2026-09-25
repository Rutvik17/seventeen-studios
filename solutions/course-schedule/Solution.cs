public class Solution {
    public bool CanFinish(int numCourses, int[][] prerequisites) {
        // Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
        var after = new List<int>[numCourses]; // course -> the courses that need it
        for (int i = 0; i < numCourses; i++) after[i] = new List<int>();
        var need = new int[numCourses]; // course -> how many prerequisites it still waits for
        foreach (var p in prerequisites) {
            after[p[1]].Add(p[0]);
            need[p[0]]++;
        }
        var ready = new Queue<int>();
        for (int c = 0; c < numCourses; c++) if (need[c] == 0) ready.Enqueue(c);
        int taken = 0;
        while (ready.Count > 0) {
            int c = ready.Dequeue();
            taken++;
            foreach (int next in after[c]) if (--need[next] == 0) ready.Enqueue(next);
        }
        return taken == numCourses; // any course never taken is on a cycle
    }
}
