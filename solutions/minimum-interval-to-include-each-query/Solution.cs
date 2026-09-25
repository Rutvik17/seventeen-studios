public class Solution {
    public int[] MinInterval(int[][] intervals, int[] queries) {
        Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0]));
        var answer = Enumerable.Repeat(-1, queries.Length).ToArray();
        var sizeOf = new PriorityQueue<(int size, int right), int>(); // started intervals, smallest first
        // Answer the queries from smallest to largest, so intervals only ever join and leave.
        var order = Enumerable.Range(0, queries.Length).OrderBy(k => queries[k]).ToArray();
        int i = 0;
        foreach (int q in order) {
            int x = queries[q];
            while (i < intervals.Length && intervals[i][0] <= x) { // every interval starting by x
                int size = intervals[i][1] - intervals[i][0] + 1;
                sizeOf.Enqueue((size, intervals[i][1]), size);
                i++;
            }
            while (sizeOf.Count > 0 && sizeOf.Peek().right < x) sizeOf.Dequeue(); // ended before x: useless now and later
            if (sizeOf.Count > 0) answer[q] = sizeOf.Peek().size; // the smallest interval holding x
        }
        return answer;
    }
}
