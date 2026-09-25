class Solution {
public:
    int maxArea(vector<int>& height) {
        int l = 0, r = (int)height.size() - 1, best = 0;
        while (l < r) {
            best = max(best, (r - l) * min(height[l], height[r]));
            // The shorter wall limits the water; moving the taller one in can only lose.
            if (height[l] < height[r]) l++;
            else r--;
        }
        return best;
    }
};
