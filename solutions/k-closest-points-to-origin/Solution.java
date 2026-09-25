class Solution {
    public int[][] kClosest(int[][] points, int k) {
        // A max-heap of the k closest so far. Squared distance x² + y² orders points
        // the same as distance, without a square root.
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(b[0] * b[0] + b[1] * b[1], a[0] * a[0] + a[1] * a[1]));
        for (int[] p : points) {
            heap.offer(p);
            if (heap.size() > k) heap.poll(); // the farthest of k + 1 is not among the closest k
        }
        return heap.toArray(new int[0][]);
    }
}
