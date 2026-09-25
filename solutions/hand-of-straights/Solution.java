class Solution {
    public boolean isNStraightHand(int[] hand, int groupSize) {
        if (hand.length % groupSize != 0) return false;
        TreeMap<Integer, Integer> count = new TreeMap<>(); // cards in increasing order
        for (int c : hand) count.merge(c, 1, Integer::sum);
        // The smallest card left must start a run — nothing smaller is left to come before it.
        for (int card : count.keySet()) {
            int n = count.get(card);
            if (n == 0) continue;
            for (int x = card; x < card + groupSize; x++) { // n runs start here, each needing card..card+size-1
                int have = count.getOrDefault(x, 0);
                if (have < n) return false;
                count.put(x, have - n);
            }
        }
        return true;
    }
}
