class Solution {
public:
    int getSum(int a, int b) {
        // a ^ b adds without carrying; (a & b) << 1 is the carry. Repeat until no carry is left.
        // The carry is shifted as unsigned: shifting a negative int left is not defined before C++20.
        while (b != 0) {
            int carry = (int)((unsigned)(a & b) << 1);
            a ^= b;
            b = carry;
        }
        return a;
    }
};
