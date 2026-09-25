public class KthLargest {
    // A min-heap of the k largest so far: its top, the smallest of them, is the k-th largest.
    private readonly PriorityQueue<int, int> heap = new();
    private readonly int k;

    public KthLargest(int k, int[] nums) {
        this.k = k;
        foreach (int x in nums) Add(x);
    }

    public int Add(int val) {
        heap.Enqueue(val, val);
        if (heap.Count > k) heap.Dequeue(); // no longer among the k largest
        return heap.Peek();
    }
}
