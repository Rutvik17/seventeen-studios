class Solution {
public:
    int lastStoneWeight(vector<int>& stones) {
        priority_queue<int> heap(stones.begin(), stones.end()); // the heaviest on top
        while (heap.size() > 1) {
            int y = heap.top(); // the two heaviest, y >= x
            heap.pop();
            int x = heap.top();
            heap.pop();
            if (y > x) heap.push(y - x);
        }
        return heap.empty() ? 0 : heap.top();
    }
};
