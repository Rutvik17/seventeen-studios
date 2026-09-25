impl Solution {
    pub fn rotate(matrix: &mut Vec<Vec<i32>>) {
        let n = matrix.len();
        // A quarter turn clockwise is a flip across the main diagonal, then each row reversed.
        for i in 0..n {
            for j in i + 1..n {
                let t = matrix[i][j];
                matrix[i][j] = matrix[j][i];
                matrix[j][i] = t;
            }
        }
        for row in matrix.iter_mut() {
            row.reverse();
        }
    }
}
