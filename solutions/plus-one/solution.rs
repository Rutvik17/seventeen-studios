impl Solution {
    pub fn plus_one(mut digits: Vec<i32>) -> Vec<i32> {
        for i in (0..digits.len()).rev() {
            if digits[i] < 9 {
                digits[i] += 1; // no carry: done
                return digits;
            }
            digits[i] = 0; // 9 + 1 = 10: write 0, carry 1 leftwards
        }
        digits.insert(0, 1); // every digit was 9: the number grows a digit
        digits
    }
}
