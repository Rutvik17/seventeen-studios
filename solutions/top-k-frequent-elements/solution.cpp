class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> count;
        for (int x : nums) count[x]++;
        // buckets[f] holds every number that appears exactly f times.
        vector<vector<int>> buckets(nums.size() + 1);
        for (auto& [x, f] : count) buckets[f].push_back(x);
        vector<int> out;
        for (int f = nums.size(); f > 0 && (int)out.size() < k; f--) {
            for (int x : buckets[f]) {
                out.push_back(x);
                if ((int)out.size() == k) break;
            }
        }
        return out;
    }
};
