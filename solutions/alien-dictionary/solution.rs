use std::collections::{BTreeMap, BTreeSet};

impl Solution {
    pub fn alien_order(words: Vec<String>) -> String {
        let words: Vec<&[u8]> = words.iter().map(|w| w.as_bytes()).collect();
        let mut after: BTreeMap<u8, BTreeSet<u8>> = BTreeMap::new(); // letter -> letters known to come after it
        let mut need: BTreeMap<u8, i32> = BTreeMap::new(); // letter -> how many letters must come before it
        for w in &words {
            for &c in w.iter() {
                after.entry(c).or_default();
                need.entry(c).or_insert(0);
            }
        }
        for pair in words.windows(2) {
            let (a, b) = (pair[0], pair[1]);
            match a.iter().zip(b.iter()).position(|(x, y)| x != y) {
                // The first difference is the only thing this pair tells us.
                Some(k) => {
                    if after.get_mut(&a[k]).unwrap().insert(b[k]) {
                        *need.get_mut(&b[k]).unwrap() += 1;
                    }
                }
                None if a.len() > b.len() => return String::new(), // "abc" before "ab" cannot be sorted
                None => {}
            }
        }
        // Kahn's algorithm, as in Course Schedule II.
        let mut order: Vec<u8> = need.iter().filter(|(_, &n)| n == 0).map(|(&c, _)| c).collect();
        let mut h = 0;
        while h < order.len() {
            for &y in &after[&order[h]] {
                let n = need.get_mut(&y).unwrap();
                *n -= 1;
                if *n == 0 {
                    order.push(y);
                }
            }
            h += 1;
        }
        if order.len() == need.len() { String::from_utf8(order).unwrap() } else { String::new() } // short means a cycle
    }
}
