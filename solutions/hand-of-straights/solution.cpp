class Solution {
public:
    bool isNStraightHand(vector<int>& hand, int groupSize) {
        if (hand.size() % groupSize) return false;
        map<int, int> count; // cards in increasing order
        for (int c : hand) count[c]++;
        // The smallest card left must start a run — nothing smaller is left to come before it.
        for (auto& [card, n0] : count) {
            int n = n0;
            if (n == 0) continue;
            for (int x = card; x < card + groupSize; x++) { // n runs start here, each needing card..card+size-1
                auto it = count.find(x);
                if (it == count.end() || it->second < n) return false;
                it->second -= n;
            }
        }
        return true;
    }
};
