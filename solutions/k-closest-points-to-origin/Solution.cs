public class Solution {
    public int[][] KClosest(int[][] points, int k) {
        // A max-heap of the k closest so far (priority: minus the squared distance).
        // Squared distance x² + y² orders points the same as distance, without a square root.
        var heap = new PriorityQueue<int[], int>();
        foreach (var p in points) {
            heap.Enqueue(p, -(p[0] * p[0] + p[1] * p[1]));
            if (heap.Count > k) heap.Dequeue(); // the farthest of k + 1 is not among the closest k
        }
        var out_ = new int[heap.Count][];
        for (int i = 0; heap.Count > 0; i++) out_[i] = heap.Dequeue();
        return out_;
    }
}
