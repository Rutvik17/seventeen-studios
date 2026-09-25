use std::collections::BTreeMap;

impl Solution {
    pub fn is_n_straight_hand(hand: Vec<i32>, group_size: i32) -> bool {
        if hand.len() % group_size as usize != 0 {
            return false;
        }
        let mut count: BTreeMap<i32, i32> = BTreeMap::new(); // cards in increasing order
        for c in hand {
            *count.entry(c).or_insert(0) += 1;
        }
        // The smallest card left must start a run — nothing smaller is left to come before it.
        let cards: Vec<i32> = count.keys().copied().collect();
        for card in cards {
            let n = count[&card];
            if n == 0 {
                continue;
            }
            for x in card..card + group_size {
                // n runs start here, each needing card..card+size-1
                match count.get_mut(&x) {
                    Some(have) if *have >= n => *have -= n,
                    _ => return false,
                }
            }
        }
        true
    }
}
