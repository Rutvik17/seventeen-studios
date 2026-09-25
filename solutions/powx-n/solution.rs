impl Solution {
    pub fn my_pow(mut x: f64, n: i32) -> f64 {
        let mut e = n as i64; // 64 bits, because -(-2^31) does not fit in an i32
        if e < 0 {
            x = 1.0 / x; // x^-n = (1/x)^n
            e = -e;
        }
        // Square-and-multiply: read n in binary. x, x², x⁴, x⁸… are one squaring apart,
        // and x^n is the product of those whose bit in n is 1.
        let mut result = 1.0;
        while e > 0 {
            if e & 1 == 1 {
                result *= x;
            }
            x *= x;
            e >>= 1;
        }
        result
    }
}
