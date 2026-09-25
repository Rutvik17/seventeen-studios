impl Solution {
    pub fn longest_increasing_path(matrix: Vec<Vec<i32>>) -> i32 {
        let (rows, cols) = (matrix.len() as i32, matrix[0].len() as i32);
        let at = |r: i32, c: i32| matrix[r as usize][c as usize];
        let inside = |r: i32, c: i32| r >= 0 && r < rows && c >= 0 && c < cols;
        const MOVES: [(i32, i32); 4] = [(1, 0), (-1, 0), (0, 1), (0, -1)];
        // Peel the matrix in layers, as in Kahn's algorithm: a cell's count is how many
        // neighbours are smaller. Cells with none start a path; removing a layer frees the next.
        let mut smaller = vec![vec![0; cols as usize]; rows as usize];
        let mut layer = vec![];
        for r in 0..rows {
            for c in 0..cols {
                for (dr, dc) in MOVES {
                    if inside(r + dr, c + dc) && at(r + dr, c + dc) < at(r, c) {
                        smaller[r as usize][c as usize] += 1;
                    }
                }
                if smaller[r as usize][c as usize] == 0 {
                    layer.push((r, c));
                }
            }
        }
        let mut length = 0;
        while !layer.is_empty() {
            length += 1; // every cell in this layer ends a path of this many cells
            let mut next = vec![];
            for &(r, c) in &layer {
                for (dr, dc) in MOVES {
                    let (x, y) = (r + dr, c + dc);
                    if inside(x, y) && at(x, y) > at(r, c) {
                        smaller[x as usize][y as usize] -= 1;
                        if smaller[x as usize][y as usize] == 0 {
                            next.push((x, y));
                        }
                    }
                }
            }
            layer = next;
        }
        length
    }
}
