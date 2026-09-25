public class Solution {
    public int[] FindOrder(int numCourses, int[][] prerequisites) {
        // Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
        var after = new List<int>[numCourses]; // course -> the courses that need it
        for (int i = 0; i < numCourses; i++) after[i] = new List<int>();
        var need = new int[numCourses]; // course -> how many prerequisites it still waits for
        foreach (var p in prerequisites) {
            after[p[1]].Add(p[0]);
            need[p[0]]++;
        }
        var order = new List<int>();
        for (int c = 0; c < numCourses; c++) if (need[c] == 0) order.Add(c);
        for (int h = 0; h < order.Count; h++)
            foreach (int next in after[order[h]]) if (--need[next] == 0) order.Add(next);
        return order.Count == numCourses ? order.ToArray() : new int[0]; // short means a cycle
    }
}
