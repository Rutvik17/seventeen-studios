public class Solution {
    public int MinEatingSpeed(int[] piles, int h) {
        int lo = 1, hi = piles.Max(); // at max(piles) every pile takes one hour
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            long hours = 0; // can exceed 32 bits when mid is small
            foreach (int p in piles) hours += (p + (long)mid - 1) / mid;
            if (hours <= h) hi = mid; // fast enough: maybe slower still works
            else lo = mid + 1; // too slow
        }
        return lo;
    }
}
