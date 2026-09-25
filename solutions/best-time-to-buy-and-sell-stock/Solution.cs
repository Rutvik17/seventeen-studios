public class Solution {
    public int MaxProfit(int[] prices) {
        int lowest = prices[0], best = 0; // lowest: the cheapest day to buy so far
        foreach (int p in prices) {
            lowest = Math.Min(lowest, p);
            best = Math.Max(best, p - lowest); // sell today, having bought at the lowest
        }
        return best;
    }
}
