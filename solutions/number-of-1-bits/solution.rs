impl Solution {
    pub fn hamming_weight(mut n: i32) -> i32 {
        let mut count = 0;
        while n != 0 {
            n &= n - 1; // n - 1 flips the lowest 1 bit and the 0s below it: & clears exactly that bit
            count += 1;
        }
        count
    }
}
