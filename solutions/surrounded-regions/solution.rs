impl Solution {
    pub fn solve(board: &mut Vec<Vec<char>>) {
        let (rows, cols) = (board.len(), board[0].len());
        // An O region survives exactly when it touches the edge. Mark those as safe ('S')
        // by spreading from every O on the edge.
        let mut stack = vec![];
        for r in 0..rows {
            for c in 0..cols {
                if (r == 0 || r == rows - 1 || c == 0 || c == cols - 1) && board[r][c] == 'O' {
                    board[r][c] = 'S';
                    stack.push((r as i32, c as i32));
                }
            }
        }
        while let Some((i, j)) = stack.pop() {
            for (x, y) in [(i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)] {
                if x >= 0 && y >= 0 && (x as usize) < rows && (y as usize) < cols && board[x as usize][y as usize] == 'O' {
                    board[x as usize][y as usize] = 'S';
                    stack.push((x, y));
                }
            }
        }
        // Every O left is surrounded: capture it. Then the safe ones go back to O.
        for row in board.iter_mut() {
            for ch in row.iter_mut() {
                *ch = if *ch == 'S' { 'O' } else { 'X' };
            }
        }
    }
}
