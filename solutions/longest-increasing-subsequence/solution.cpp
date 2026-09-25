class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        // tails[k]: the smallest last value of any increasing run of length k + 1 seen so far.
        // tails is itself increasing, so each number finds its place by binary search.
        vector<int> tails;
        for (int x : nums) {
            auto it = lower_bound(tails.begin(), tails.end(), x); // the first tail >= x
            if (it == tails.end()) tails.push_back(x); // x extends the longest run
            else *it = x; // a run of that length can now end lower
        }
        return tails.size();
    }
};
