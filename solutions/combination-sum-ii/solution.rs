impl Solution {
    pub fn combination_sum2(mut candidates: Vec<i32>, target: i32) -> Vec<Vec<i32>> {
        candidates.sort(); // equal values side by side, and too big means every later one is too
        fn pick(c: &[i32], start: usize, left: i32, cur: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
            if left == 0 {
                out.push(cur.clone());
                return;
            }
            for i in start..c.len() {
                if i > start && c[i] == c[i - 1] {
                    continue; // the same value in the same place would repeat a combination
                }
                if c[i] > left {
                    break;
                }
                cur.push(c[i]);
                pick(c, i + 1, left - c[i], cur, out); // each candidate used at most once
                cur.pop();
            }
        }
        let mut out = vec![];
        pick(&candidates, 0, target, &mut vec![], &mut out);
        out
    }
}
