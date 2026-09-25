class Solution {
    public int[] findOrder(int numCourses, int[][] prerequisites) {
        // Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
        List<List<Integer>> after = new ArrayList<>(); // course -> the courses that need it
        for (int i = 0; i < numCourses; i++) after.add(new ArrayList<>());
        int[] need = new int[numCourses]; // course -> how many prerequisites it still waits for
        for (int[] p : prerequisites) {
            after.get(p[1]).add(p[0]);
            need[p[0]]++;
        }
        int[] order = new int[numCourses];
        int n = 0;
        for (int c = 0; c < numCourses; c++) if (need[c] == 0) order[n++] = c;
        for (int h = 0; h < n; h++)
            for (int next : after.get(order[h])) if (--need[next] == 0) order[n++] = next;
        return n == numCourses ? order : new int[0]; // short means a cycle
    }
}
