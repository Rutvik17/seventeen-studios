impl Solution {
    pub fn exist(mut board: Vec<Vec<char>>, word: String) -> bool {
        let word: Vec<char> = word.chars().collect();
        // Quick refusal: the board must hold enough of every letter the word needs.
        let mut have = [0i32; 128];
        for row in &board {
            for &c in row {
                have[c as usize] += 1;
            }
        }
        for &c in &word {
            have[c as usize] -= 1;
            if have[c as usize] < 0 {
                return false;
            }
        }
        // Can word[i..] be traced starting at (r, c)?
        fn trace(board: &mut Vec<Vec<char>>, word: &[char], r: i32, c: i32, i: usize) -> bool {
            if r < 0 || r >= board.len() as i32 || c < 0 || c >= board[0].len() as i32 || board[r as usize][c as usize] != word[i] {
                return false;
            }
            if i == word.len() - 1 {
                return true;
            }
            board[r as usize][c as usize] = '#'; // in use on this path
            let found = trace(board, word, r + 1, c, i + 1) || trace(board, word, r - 1, c, i + 1) || trace(board, word, r, c + 1, i + 1) || trace(board, word, r, c - 1, i + 1);
            board[r as usize][c as usize] = word[i]; // free it again
            found
        }
        for r in 0..board.len() {
            for c in 0..board[0].len() {
                if trace(&mut board, &word, r as i32, c as i32, 0) {
                    return true;
                }
            }
        }
        false
    }
}
