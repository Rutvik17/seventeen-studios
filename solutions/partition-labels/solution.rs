impl Solution {
    pub fn partition_labels(s: String) -> Vec<i32> {
        let b = s.as_bytes();
        let mut last = [0usize; 26]; // where each letter appears for the last time
        for (i, &c) in b.iter().enumerate() {
            last[(c - b'a') as usize] = i;
        }
        let mut sizes = vec![];
        let (mut start, mut end) = (0, 0);
        for (i, &c) in b.iter().enumerate() {
            end = end.max(last[(c - b'a') as usize]); // this part must reach at least that far
            if i == end {
                // every letter seen so far is finished: cut here
                sizes.push((end - start + 1) as i32);
                start = i + 1;
            }
        }
        sizes
    }
}
