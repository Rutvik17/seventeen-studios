use std::collections::HashSet;

impl Solution {
    pub fn word_break(s: String, word_dict: Vec<String>) -> bool {
        let words: HashSet<&str> = word_dict.iter().map(|w| w.as_str()).collect();
        let longest = word_dict.iter().map(|w| w.len()).max().unwrap_or(0);
        // ok[i]: can s[..i] be split into words? It can if some word ends at i and
        // the part before that word can be split too.
        let mut ok = vec![false; s.len() + 1];
        ok[0] = true;
        for i in 1..=s.len() {
            // no word is longer than `longest`
            ok[i] = (i.saturating_sub(longest)..i).any(|j| ok[j] && words.contains(&s[j..i]));
        }
        ok[s.len()]
    }
}
