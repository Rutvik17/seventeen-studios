#[derive(Default)]
struct Trie {
    next: [Option<Box<Trie>>; 26], // one slot per letter
    end: bool,                     // a word ends here
}

impl Trie {
    fn new() -> Self {
        Self::default()
    }

    fn insert(&mut self, word: String) {
        let mut node = self;
        for b in word.bytes() {
            node = node.next[(b - b'a') as usize].get_or_insert_with(Default::default);
        }
        node.end = true;
    }

    /// The node reached by spelling s, if any.
    fn walk(&self, s: &str) -> Option<&Trie> {
        let mut node = self;
        for b in s.bytes() {
            node = node.next[(b - b'a') as usize].as_deref()?;
        }
        Some(node)
    }

    fn search(&self, word: String) -> bool {
        self.walk(&word).is_some_and(|n| n.end)
    }

    fn starts_with(&self, prefix: String) -> bool {
        self.walk(&prefix).is_some()
    }
}
