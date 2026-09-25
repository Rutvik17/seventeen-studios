use std::cmp::Ordering;

impl Solution {
    pub fn search_matrix(matrix: Vec<Vec<i32>>, target: i32) -> bool {
        let cols = matrix[0].len();
        let (mut lo, mut hi) = (0, matrix.len() * cols); // read row by row, one sorted list: [lo, hi)
        while lo < hi {
            let mid = lo + (hi - lo) / 2;
            match matrix[mid / cols][mid % cols].cmp(&target) {
                Ordering::Equal => return true,
                Ordering::Less => lo = mid + 1,
                Ordering::Greater => hi = mid,
            }
        }
        false
    }
}
