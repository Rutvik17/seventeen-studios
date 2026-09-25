use std::collections::HashSet;

impl Solution {
    pub fn ladder_length(begin_word: String, end_word: String, word_list: Vec<String>) -> i32 {
        let mut words: HashSet<Vec<u8>> = word_list.into_iter().map(|w| w.into_bytes()).collect();
        let end = end_word.into_bytes();
        if !words.contains(&end) {
            return 0;
        }
        // Breadth-first: every word reached in round k is k steps from the start, the fewest possible.
        let begin = begin_word.into_bytes();
        words.remove(&begin);
        let mut frontier = vec![begin];
        let mut steps = 1;
        while !frontier.is_empty() {
            let mut next = vec![];
            for mut w in frontier {
                if w == end {
                    return steps;
                }
                for i in 0..w.len() {
                    let keep = w[i];
                    for ch in b'a'..=b'z' {
                        // every word one letter away
                        w[i] = ch;
                        if words.remove(&w) {
                            next.push(w.clone()); // reached now, by the shortest route
                        }
                    }
                    w[i] = keep;
                }
            }
            frontier = next;
            steps += 1;
        }
        0
    }
}
