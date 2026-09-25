class Solution {
    public int hammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            n &= n - 1; // n - 1 flips the lowest 1 bit and the 0s below it: & clears exactly that bit
            count++;
        }
        return count;
    }
}
