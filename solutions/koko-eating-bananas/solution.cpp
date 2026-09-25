class Solution {
public:
    int minEatingSpeed(vector<int>& piles, int h) {
        int lo = 1, hi = *max_element(piles.begin(), piles.end()); // at hi every pile takes an hour
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            long long hours = 0; // can exceed 32 bits when mid is small
            for (int p : piles) hours += (p + (long long)mid - 1) / mid;
            if (hours <= h) hi = mid; // fast enough: maybe slower still works
            else lo = mid + 1; // too slow
        }
        return lo;
    }
};
