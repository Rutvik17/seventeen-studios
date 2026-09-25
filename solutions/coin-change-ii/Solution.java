class Solution {
    public int change(int amount, int[] coins) {
        // ways[x]: combinations making x from the coins taken so far. Taking coins one kind at a
        // time counts each combination once, in one order — 1 + 2 and 2 + 1 are not both counted.
        // Only the final answer is sure to fit in an int; Java's int addition wraps modulo 2^32,
        // and additions wrapped that way still give the right final value.
        int[] ways = new int[amount + 1];
        ways[0] = 1;
        for (int c : coins)
            for (int x = c; x <= amount; x++) ways[x] += ways[x - c];
        return ways[amount];
    }
}
