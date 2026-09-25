class Solution {
    public int maxProfit(int[] prices) {
        // The best profit at the end of each day, in each of three states:
        //   hold: owning a share;  sold: sold one today (so tomorrow must rest);  rest: free to buy.
        int hold = Integer.MIN_VALUE / 2, sold = 0, rest = 0; // "minus infinity", halved so adding a price cannot overflow
        for (int p : prices) {
            int h = Math.max(hold, rest - p), s = hold + p, r = Math.max(rest, sold);
            hold = h;
            sold = s;
            rest = r;
        }
        return Math.max(sold, rest);
    }
}
