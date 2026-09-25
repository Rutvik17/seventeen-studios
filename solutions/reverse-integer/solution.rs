impl Solution {
    pub fn reverse(mut x: i32) -> i32 {
        let mut out: i32 = 0;
        while x != 0 {
            let d = x % 10; // keeps x's sign, so negatives reverse into negatives
            x /= 10;
            // Check before growing: out * 10 + d must stay within an i32.
            match out.checked_mul(10).and_then(|v| v.checked_add(d)) {
                Some(v) => out = v,
                None => return 0,
            }
        }
        out
    }
}
