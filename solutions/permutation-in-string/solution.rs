impl Solution {
    pub fn check_inclusion(s1: String, s2: String) -> bool {
        let (a, b) = (s1.as_bytes(), s2.as_bytes());
        let n = a.len();
        if n > b.len() {
            return false;
        }
        let mut need = [0i32; 26]; // how many more of each letter the window still needs
        for &c in a {
            need[(c - b'a') as usize] += 1;
        }
        let mut missing = n; // letters of s1 not yet matched by the window
        for r in 0..b.len() {
            let c = (b[r] - b'a') as usize;
            if need[c] > 0 {
                missing -= 1;
            }
            need[c] -= 1;
            if r >= n {
                let d = (b[r - n] - b'a') as usize; // drop the window's first letter
                need[d] += 1;
                if need[d] > 0 {
                    missing += 1;
                }
            }
            if missing == 0 {
                return true;
            }
        }
        false
    }
}
