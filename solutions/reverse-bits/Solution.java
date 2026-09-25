class Solution {
    // You need to treat n as an unsigned value.
    public int reverseBits(int n) {
        int out = 0;
        for (int i = 0; i < 32; i++) {
            out = (out << 1) | (n & 1); // take n's lowest bit onto out's low end
            n >>>= 1;
        }
        return out;
    }
}
