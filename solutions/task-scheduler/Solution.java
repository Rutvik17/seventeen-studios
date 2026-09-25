class Solution {
    public int leastInterval(char[] tasks, int n) {
        int[] count = new int[26];
        for (char t : tasks) count[t - 'A']++;
        int most = 0, tied = 0; // how often the commonest task occurs, and how many tasks occur that often
        for (int c : count) {
            if (c > most) {
                most = c;
                tied = 1;
            } else if (c == most) tied++;
        }
        // The commonest task needs (most - 1) frames of n + 1 slots, then one last run holding
        // every task tied for commonest. If other tasks overflow the frames, nothing idles.
        return Math.max(tasks.length, (most - 1) * (n + 1) + tied);
    }
}
