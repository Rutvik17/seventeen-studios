class Solution {
    public int getSum(int a, int b) {
        // a ^ b adds without carrying; (a & b) << 1 is the carry. Repeat until no carry is left.
        while (b != 0) {
            int carry = (a & b) << 1;
            a ^= b;
            b = carry;
        }
        return a;
    }
}
