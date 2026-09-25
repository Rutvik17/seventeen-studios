class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int lowest = prices[0], best = 0; // lowest: the cheapest day to buy so far
        for (int p : prices) {
            lowest = min(lowest, p);
            best = max(best, p - lowest); // sell today, having bought at the lowest
        }
        return best;
    }
};
