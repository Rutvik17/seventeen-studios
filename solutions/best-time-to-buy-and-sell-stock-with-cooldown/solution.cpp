class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // The best profit at the end of each day, in each of three states:
        //   hold: owning a share;  sold: sold one today (so tomorrow must rest);  rest: free to buy.
        int hold = INT_MIN / 2, sold = 0, rest = 0; // "minus infinity", halved so adding a price cannot overflow
        for (int p : prices) {
            int h = max(hold, rest - p), s = hold + p, r = max(rest, sold);
            hold = h;
            sold = s;
            rest = r;
        }
        return max(sold, rest);
    }
};
