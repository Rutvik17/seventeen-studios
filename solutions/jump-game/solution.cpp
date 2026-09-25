class Solution {
public:
    bool canJump(vector<int>& nums) {
        int reach = 0; // the furthest index reachable so far
        for (int i = 0; i < (int)nums.size(); i++) {
            if (i > reach) return false; // a gap nothing can jump across
            reach = max(reach, i + nums[i]);
        }
        return true;
    }
};
