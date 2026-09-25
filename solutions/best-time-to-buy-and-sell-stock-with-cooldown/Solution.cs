public class Solution {
    public int MaxProfit(int[] prices) {
        // The best profit at the end of each day, in each of three states:
        //   hold: owning a share;  sold: sold one today (so tomorrow must rest);  rest: free to buy.
        int hold = int.MinValue / 2, sold = 0, rest = 0; // "minus infinity", halved so adding a price cannot overflow
        foreach (int p in prices) (hold, sold, rest) = (Math.Max(hold, rest - p), hold + p, Math.Max(rest, sold));
        return Math.Max(sold, rest);
    }
}
