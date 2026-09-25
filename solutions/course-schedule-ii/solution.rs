impl Solution {
    pub fn find_order(num_courses: i32, prerequisites: Vec<Vec<i32>>) -> Vec<i32> {
        // Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
        let n = num_courses as usize;
        let mut after = vec![vec![]; n]; // course -> the courses that need it
        let mut need = vec![0; n]; // course -> how many prerequisites it still waits for
        for p in &prerequisites {
            after[p[1] as usize].push(p[0] as usize);
            need[p[0] as usize] += 1;
        }
        let mut order: Vec<usize> = (0..n).filter(|&c| need[c] == 0).collect();
        let mut h = 0;
        while h < order.len() {
            for &next in &after[order[h]] {
                need[next] -= 1;
                if need[next] == 0 {
                    order.push(next);
                }
            }
            h += 1;
        }
        if order.len() < n {
            return vec![]; // short means a cycle
        }
        order.into_iter().map(|c| c as i32).collect()
    }
}
