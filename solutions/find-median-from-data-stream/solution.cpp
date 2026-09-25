class MedianFinder {
    // low: the smaller half, largest on top; high: the larger half, smallest on top.
    // low holds the same number as high, or one more.
    priority_queue<int> low;
    priority_queue<int, vector<int>, greater<int>> high;
public:
    MedianFinder() {}

    void addNum(int num) {
        low.push(num);
        high.push(low.top()); // the largest of the low half moves up
        low.pop();
        if (high.size() > low.size()) { // rebalance
            low.push(high.top());
            high.pop();
        }
    }

    double findMedian() {
        return low.size() > high.size() ? low.top() : (low.top() + (double)high.top()) / 2;
    }
};
