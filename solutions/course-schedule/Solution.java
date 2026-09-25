class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        // Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
        List<List<Integer>> after = new ArrayList<>(); // course -> the courses that need it
        for (int i = 0; i < numCourses; i++) after.add(new ArrayList<>());
        int[] need = new int[numCourses]; // course -> how many prerequisites it still waits for
        for (int[] p : prerequisites) {
            after.get(p[1]).add(p[0]);
            need[p[0]]++;
        }
        Deque<Integer> ready = new ArrayDeque<>();
        for (int c = 0; c < numCourses; c++) if (need[c] == 0) ready.add(c);
        int taken = 0;
        while (!ready.isEmpty()) {
            int c = ready.poll();
            taken++;
            for (int next : after.get(c)) if (--need[next] == 0) ready.add(next);
        }
        return taken == numCourses; // any course never taken is on a cycle
    }
}
