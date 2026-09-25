class Solution {
public:
    int minCostClimbingStairs(vector<int>& cost) {
        // reach(i): cheapest way to stand on step i (the top is step n). Steps 0 and 1 are free.
        // reach(i) = min(reach(i - 1) + cost[i - 1], reach(i - 2) + cost[i - 2])
        int a = 0, b = 0; // reach(i - 2), reach(i - 1)
        for (size_t i = 2; i <= cost.size(); i++) {
            int c = min(b + cost[i - 1], a + cost[i - 2]);
            a = b;
            b = c;
        }
        return b;
    }
};
