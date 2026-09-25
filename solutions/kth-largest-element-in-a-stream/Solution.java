class KthLargest {
    // A min-heap of the k largest so far: its top, the smallest of them, is the k-th largest.
    private final PriorityQueue<Integer> heap = new PriorityQueue<>();
    private final int k;

    public KthLargest(int k, int[] nums) {
        this.k = k;
        for (int x : nums) add(x);
    }

    public int add(int val) {
        heap.offer(val);
        if (heap.size() > k) heap.poll(); // no longer among the k largest
        return heap.peek();
    }
}
