use std::collections::HashMap;

// A doubly linked list kept in a Vec, linked by index: Rust's ownership rules make
// pointer-linked doubly linked lists awkward, and indices are just as fast.
struct Entry {
    key: i32,
    val: i32,
    prev: usize,
    next: usize,
}

struct LRUCache {
    cap: usize,
    map: HashMap<i32, usize>, // key -> index of its entry
    list: Vec<Entry>,         // list[0] is head, list[1] is tail; least recent after head
}

impl LRUCache {
    fn new(capacity: i32) -> Self {
        let list = vec![Entry { key: 0, val: 0, prev: 0, next: 1 }, Entry { key: 0, val: 0, prev: 0, next: 1 }];
        LRUCache { cap: capacity as usize, map: HashMap::new(), list }
    }

    fn unlink(&mut self, i: usize) {
        let (p, n) = (self.list[i].prev, self.list[i].next);
        self.list[p].next = n;
        self.list[n].prev = p;
    }

    fn push_recent(&mut self, i: usize) {
        let last = self.list[1].prev;
        self.list[i].prev = last;
        self.list[i].next = 1;
        self.list[last].next = i;
        self.list[1].prev = i;
    }

    fn get(&mut self, key: i32) -> i32 {
        match self.map.get(&key).copied() {
            None => -1,
            Some(i) => {
                self.unlink(i);
                self.push_recent(i); // it has just been used
                self.list[i].val
            }
        }
    }

    fn put(&mut self, key: i32, value: i32) {
        if let Some(&i) = self.map.get(&key) {
            self.list[i].val = value;
            self.unlink(i);
            self.push_recent(i);
            return;
        }
        let i = if self.map.len() == self.cap {
            let lru = self.list[0].next; // the least recently used: reuse its slot
            self.unlink(lru);
            self.map.remove(&self.list[lru].key);
            lru
        } else {
            self.list.push(Entry { key, val: value, prev: 0, next: 0 });
            self.list.len() - 1
        };
        self.list[i].key = key;
        self.list[i].val = value;
        self.map.insert(key, i);
        self.push_recent(i);
    }
}
