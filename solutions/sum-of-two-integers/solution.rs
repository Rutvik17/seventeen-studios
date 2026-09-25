impl Solution {
    pub fn get_sum(mut a: i32, mut b: i32) -> i32 {
        // a ^ b adds without carrying; (a & b) << 1 is the carry. Repeat until no carry is left.
        while b != 0 {
            let carry = (a & b) << 1;
            a ^= b;
            b = carry;
        }
        a
    }
}
