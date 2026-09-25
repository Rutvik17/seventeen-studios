public class Solution {
    public bool IsNStraightHand(int[] hand, int groupSize) {
        if (hand.Length % groupSize != 0) return false;
        var count = new SortedDictionary<int, int>(); // cards in increasing order
        foreach (int c in hand) count[c] = count.GetValueOrDefault(c) + 1;
        // The smallest card left must start a run — nothing smaller is left to come before it.
        foreach (int card in count.Keys.ToList()) {
            int n = count[card];
            if (n == 0) continue;
            for (int x = card; x < card + groupSize; x++) { // n runs start here, each needing card..card+size-1
                if (count.GetValueOrDefault(x) < n) return false;
                count[x] -= n;
            }
        }
        return true;
    }
}
