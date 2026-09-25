use std::collections::VecDeque;

impl Solution {
    pub fn can_finish(num_courses: i32, prerequisites: Vec<Vec<i32>>) -> bool {
        // Kahn's algorithm: take any course with no unmet prerequisite, then update the rest.
        let n = num_courses as usize;
        let mut after = vec![vec![]; n]; // course -> the courses that need it
        let mut need = vec![0; n]; // course -> how many prerequisites it still waits for
        for p in &prerequisites {
            after[p[1] as usize].push(p[0] as usize);
            need[p[0] as usize] += 1;
        }
        let mut ready: VecDeque<usize> = (0..n).filter(|&c| need[c] == 0).collect();
        let mut taken = 0;
        while let Some(c) = ready.pop_front() {
            taken += 1;
            for &next in &after[c] {
                need[next] -= 1;
                if need[next] == 0 {
                    ready.push_back(next);
                }
            }
        }
        taken == n // any course never taken is on a cycle
    }
}
