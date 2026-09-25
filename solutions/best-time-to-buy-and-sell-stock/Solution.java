class Solution {
    public int maxProfit(int[] prices) {
        int lowest = prices[0], best = 0; // lowest: the cheapest day to buy so far
        for (int p : prices) {
            lowest = Math.min(lowest, p);
            best = Math.max(best, p - lowest); // sell today, having bought at the lowest
        }
        return best;
    }
}
