class Solution {
public:
    vector<int> countBits(int n) {
        // i >> 1 is i without its last bit, and already counted; add that last bit back.
        vector<int> ones(n + 1, 0);
        for (int i = 1; i <= n; i++) ones[i] = ones[i >> 1] + (i & 1);
        return ones;
    }
};
