impl Solution {
    pub fn set_zeroes(matrix: &mut Vec<Vec<i32>>) {
        let (rows, cols) = (matrix.len(), matrix[0].len());
        // Use the first row and column as the notes of which columns and rows to clear.
        // Their own cells are needed for that, so remember separately whether they had a 0.
        let first_row = matrix[0].contains(&0);
        let first_col = matrix.iter().any(|row| row[0] == 0);
        for r in 1..rows {
            for c in 1..cols {
                if matrix[r][c] == 0 {
                    matrix[r][0] = 0;
                    matrix[0][c] = 0;
                }
            }
        }
        for r in 1..rows {
            for c in 1..cols {
                if matrix[r][0] == 0 || matrix[0][c] == 0 {
                    matrix[r][c] = 0;
                }
            }
        }
        if first_row {
            matrix[0].iter_mut().for_each(|v| *v = 0);
        }
        if first_col {
            matrix.iter_mut().for_each(|row| row[0] = 0);
        }
    }
}
