class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        // fewest[x]: the fewest coins making x. The last coin is some c, so
        // fewest[x] = 1 + min(fewest[x - c]) over every coin c <= x.
        int INF = amount + 1; // more coins than could ever be needed
        vector<int> fewest(amount + 1, INF);
        fewest[0] = 0;
        for (int x = 1; x <= amount; x++)
            for (int c : coins)
                if (c <= x && fewest[x - c] + 1 < fewest[x]) fewest[x] = fewest[x - c] + 1;
        return fewest[amount] == INF ? -1 : fewest[amount];
    }
};
