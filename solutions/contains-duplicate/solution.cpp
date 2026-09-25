class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        unordered_set<int> seen;
        for (int x : nums) {
            if (!seen.insert(x).second) return true; // .second is false when x was already there
        }
        return false;
    }
};
