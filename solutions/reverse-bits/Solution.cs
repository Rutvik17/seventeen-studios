public class Solution {
    public uint ReverseBits(uint n) {
        uint out_ = 0;
        for (int i = 0; i < 32; i++) {
            out_ = (out_ << 1) | (n & 1); // take n's lowest bit onto out's low end
            n >>= 1;
        }
        return out_;
    }
}
