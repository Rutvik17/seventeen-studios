class KthLargest {
    // A min-heap of the k largest so far: its top, the smallest of them, is the k-th largest.
    priority_queue<int, vector<int>, greater<int>> heap;
    int k;
public:
    KthLargest(int k, vector<int> nums) : k(k) {
        for (int x : nums) add(x);
    }

    int add(int val) {
        heap.push(val);
        if ((int)heap.size() > k) heap.pop(); // no longer among the k largest
        return heap.top();
    }
};
