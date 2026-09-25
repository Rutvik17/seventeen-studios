impl Solution {
    pub fn combination_sum(mut candidates: Vec<i32>, target: i32) -> Vec<Vec<i32>> {
        candidates.sort(); // so a candidate too big means every later one is too
        // Add candidates from index start on; left: what is still needed.
        fn pick(c: &[i32], start: usize, left: i32, cur: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
            if left == 0 {
                out.push(cur.clone());
                return;
            }
            for i in start..c.len() {
                if c[i] > left {
                    break;
                }
                cur.push(c[i]);
                pick(c, i, left - c[i], cur, out); // i, not i + 1: the same number may be used again
                cur.pop();
            }
        }
        let mut out = vec![];
        pick(&candidates, 0, target, &mut vec![], &mut out);
        out
    }
}
