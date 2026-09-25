use std::collections::HashMap;

struct TimeMap {
    // key -> (timestamp, value) pairs. Timestamps arrive increasing, so each list is sorted.
    store: HashMap<String, Vec<(i32, String)>>,
}

impl TimeMap {
    fn new() -> Self {
        TimeMap { store: HashMap::new() }
    }

    fn set(&mut self, key: String, value: String, timestamp: i32) {
        self.store.entry(key).or_default().push((timestamp, value));
    }

    fn get(&self, key: String, timestamp: i32) -> String {
        match self.store.get(&key) {
            None => String::new(),
            Some(entries) => {
                // How many entries are at or before timestamp; the last of them is the latest.
                let n = entries.partition_point(|(t, _)| *t <= timestamp);
                if n == 0 { String::new() } else { entries[n - 1].1.clone() }
            }
        }
    }
}
