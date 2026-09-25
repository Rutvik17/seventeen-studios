impl Solution {
    pub fn least_interval(tasks: Vec<char>, n: i32) -> i32 {
        let mut count = [0i32; 26];
        for t in &tasks {
            count[(*t as u8 - b'A') as usize] += 1;
        }
        let most = *count.iter().max().unwrap(); // how often the commonest task occurs
        let tied = count.iter().filter(|&&c| c == most).count() as i32; // how many tasks occur that often
        // The commonest task needs (most - 1) frames of n + 1 slots, then one last run holding
        // every task tied for commonest. If other tasks overflow the frames, nothing idles.
        (tasks.len() as i32).max((most - 1) * (n + 1) + tied)
    }
}
