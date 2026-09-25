impl Solution {
    pub fn find_words(mut board: Vec<Vec<char>>, words: Vec<String>) -> Vec<String> {
        // One trie of all the words, as a list of nodes: next[letter] is a child's index (0 = none).
        struct Node {
            next: [usize; 26],
            word: Option<usize>, // the word that ends here, until it is found
            kids: usize,         // children still in use
        }
        let mut trie = vec![Node { next: [0; 26], word: None, kids: 0 }];
        for (i, w) in words.iter().enumerate() {
            let mut at = 0;
            for b in w.bytes() {
                let k = (b - b'a') as usize;
                if trie[at].next[k] == 0 {
                    trie.push(Node { next: [0; 26], word: None, kids: 0 });
                    let id = trie.len() - 1;
                    trie[at].next[k] = id;
                    trie[at].kids += 1;
                }
                at = trie[at].next[k];
            }
            trie[at].word = Some(i);
        }
        fn dfs(board: &mut Vec<Vec<char>>, r: usize, c: usize, parent: usize, trie: &mut Vec<Node>, words: &[String], found: &mut Vec<String>) {
            let ch = board[r][c];
            let k = (ch as u8 - b'a') as usize;
            let node = trie[parent].next[k];
            if let Some(i) = trie[node].word.take() {
                found.push(words[i].clone()); // take it once
            }
            board[r][c] = '#'; // in use on this path
            let (rows, cols) = (board.len() as i32, board[0].len() as i32);
            for (dr, dc) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
                let (nr, nc) = (r as i32 + dr, c as i32 + dc);
                if nr < 0 || nr >= rows || nc < 0 || nc >= cols {
                    continue;
                }
                let next = board[nr as usize][nc as usize];
                if next != '#' && trie[node].next[(next as u8 - b'a') as usize] != 0 {
                    dfs(board, nr as usize, nc as usize, node, trie, words, found);
                }
            }
            board[r][c] = ch;
            if trie[node].kids == 0 && trie[node].word.is_none() {
                // nothing left to find below: prune the branch
                trie[parent].next[k] = 0;
                trie[parent].kids -= 1;
            }
        }
        let mut found = vec![];
        for r in 0..board.len() {
            for c in 0..board[0].len() {
                let k = (board[r][c] as u8 - b'a') as usize;
                if trie[0].next[k] != 0 {
                    dfs(&mut board, r, c, 0, &mut trie, &words, &mut found);
                }
            }
        }
        found
    }
}
