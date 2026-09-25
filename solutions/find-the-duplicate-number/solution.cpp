class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        // Read i -> nums[i] as a linked list; the repeated value is where its loop begins.
        int slow = 0, fast = 0;
        do { slow = nums[slow]; fast = nums[nums[fast]]; } while (slow != fast);
        // From the start and from the meeting point, equal steps reach the loop's entrance.
        slow = 0;
        while (slow != fast) { slow = nums[slow]; fast = nums[fast]; }
        return slow;
    }
};
