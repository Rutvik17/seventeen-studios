impl Solution {
    pub fn solve_n_queens(n: i32) -> Vec<Vec<String>> {
        let n = n as usize;
        // A queen attacks along its column and both diagonals. On one "\" diagonal r - c
        // is the same; on one "/" diagonal r + c is (shifted by n so it is never negative).
        struct Board {
            n: usize,
            cols: Vec<bool>,
            down: Vec<bool>,
            up: Vec<bool>,
            rows: Vec<Vec<u8>>,
            out: Vec<Vec<String>>,
        }
        // Rows above r each hold one queen.
        fn place(b: &mut Board, r: usize) {
            let n = b.n;
            if r == n {
                b.out.push(b.rows.iter().map(|row| String::from_utf8(row.clone()).unwrap()).collect());
                return;
            }
            for c in 0..n {
                if b.cols[c] || b.down[r + n - c] || b.up[r + c] {
                    continue;
                }
                (b.cols[c], b.down[r + n - c], b.up[r + c]) = (true, true, true);
                b.rows[r][c] = b'Q';
                place(b, r + 1);
                b.rows[r][c] = b'.'; // take it back and try the next column
                (b.cols[c], b.down[r + n - c], b.up[r + c]) = (false, false, false);
            }
        }
        let mut b = Board { n, cols: vec![false; n], down: vec![false; 2 * n], up: vec![false; 2 * n], rows: vec![vec![b'.'; n]; n], out: vec![] };
        place(&mut b, 0);
        b.out
    }
}
