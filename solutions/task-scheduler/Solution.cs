public class Solution {
    public int LeastInterval(char[] tasks, int n) {
        var count = new int[26];
        foreach (char t in tasks) count[t - 'A']++;
        int most = count.Max(); // how often the commonest task occurs
        int tied = count.Count(c => c == most); // how many tasks occur that often
        // The commonest task needs (most - 1) frames of n + 1 slots, then one last run holding
        // every task tied for commonest. If other tasks overflow the frames, nothing idles.
        return Math.Max(tasks.Length, (most - 1) * (n + 1) + tied);
    }
}
