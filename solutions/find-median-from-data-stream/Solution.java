class MedianFinder {
    // low: the smaller half, largest on top; high: the larger half, smallest on top.
    // low holds the same number as high, or one more.
    private final PriorityQueue<Integer> low = new PriorityQueue<>(Collections.reverseOrder());
    private final PriorityQueue<Integer> high = new PriorityQueue<>();

    public void addNum(int num) {
        low.offer(num);
        high.offer(low.poll()); // the largest of the low half moves up
        if (high.size() > low.size()) low.offer(high.poll()); // rebalance
    }

    public double findMedian() {
        return low.size() > high.size() ? low.peek() : (low.peek() + (double) high.peek()) / 2;
    }
}
