class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        deque<int> dq; // indices whose values decrease front to back
        vector<int> out;
        for (int i = 0; i < (int)nums.size(); i++) {
            while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back(); // can never be a max again
            dq.push_back(i);
            if (dq.front() <= i - k) dq.pop_front(); // the front has slid out of the window
            if (i >= k - 1) out.push_back(nums[dq.front()]); // the front is the maximum
        }
        return out;
    }
};
