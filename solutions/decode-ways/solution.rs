impl Solution {
    pub fn num_decodings(s: String) -> i32 {
        // ways(i): decodings of s[i..]. A letter is one digit 1-9, or two digits 10-26.
        // ways(i) = [s[i] != '0'] * ways(i + 1) + [s[i..i+1] in 10..26] * ways(i + 2)
        let b = s.as_bytes();
        let (mut next, mut next2) = (1, 0); // ways(i + 1), ways(i + 2); the empty end decodes one way
        for i in (0..b.len()).rev() {
            let mut cur = 0;
            if b[i] != b'0' {
                cur = next;
                if i + 1 < b.len() && (b[i] - b'0') as i32 * 10 + (b[i + 1] - b'0') as i32 <= 26 {
                    cur += next2;
                }
            }
            (next, next2) = (cur, next);
        }
        next
    }
}
