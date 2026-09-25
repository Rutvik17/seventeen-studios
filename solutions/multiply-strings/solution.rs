impl Solution {
    pub fn multiply(num1: String, num2: String) -> String {
        if num1 == "0" || num2 == "0" {
            return "0".to_string();
        }
        let (a, b) = (num1.as_bytes(), num2.as_bytes());
        // Long multiplication: digit i of num1 times digit j of num2 lands at place i + j + 1
        // of the product (counting from the left, with room for one extra digit).
        let mut out = vec![0u32; a.len() + b.len()];
        for i in (0..a.len()).rev() {
            for j in (0..b.len()).rev() {
                let total = out[i + j + 1] + (a[i] - b'0') as u32 * (b[j] - b'0') as u32;
                out[i + j + 1] = total % 10;
                out[i + j] += total / 10; // the carry, settled when that place is reached
            }
        }
        out.iter().skip_while(|&&d| d == 0).map(|d| char::from(b'0' + *d as u8)).collect()
    }
}
