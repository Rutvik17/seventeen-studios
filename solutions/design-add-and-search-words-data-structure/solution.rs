#[derive(Default)]
struct WordDictionary {
    next: [Option<Box<WordDictionary>>; 26], // a trie: one slot per letter
    end: bool,
}

impl WordDictionary {
    fn new() -> Self {
        Self::default()
    }

    fn add_word(&mut self, word: String) {
        let mut node = self;
        for b in word.bytes() {
            node = node.next[(b - b'a') as usize].get_or_insert_with(Default::default);
        }
        node.end = true;
    }

    fn search(&self, word: String) -> bool {
        fn find(node: &WordDictionary, w: &[u8]) -> bool {
            match w.first() {
                None => node.end,
                // any letter: try every child
                Some(b'.') => node.next.iter().flatten().any(|child| find(child, &w[1..])),
                Some(&b) => node.next[(b - b'a') as usize].as_deref().is_some_and(|child| find(child, &w[1..])),
            }
        }
        find(self, word.as_bytes())
    }
}
