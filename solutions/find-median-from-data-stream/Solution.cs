public class MedianFinder {
    // low: the smaller half, largest on top (priority -value); high: the larger half, smallest on top.
    // low holds the same number as high, or one more.
    private readonly PriorityQueue<int, int> low = new();
    private readonly PriorityQueue<int, int> high = new();

    public void AddNum(int num) {
        low.Enqueue(num, -num);
        int top = low.Dequeue(); // the largest of the low half moves up
        high.Enqueue(top, top);
        if (high.Count > low.Count) { // rebalance
            int x = high.Dequeue();
            low.Enqueue(x, -x);
        }
    }

    public double FindMedian() {
        return low.Count > high.Count ? low.Peek() : (low.Peek() + (double)high.Peek()) / 2;
    }
}
