impl Solution {
    pub fn spiral_order(matrix: Vec<Vec<i32>>) -> Vec<i32> {
        let mut out = vec![];
        let (mut top, mut bottom, mut left, mut right) = (0i32, matrix.len() as i32 - 1, 0i32, matrix[0].len() as i32 - 1); // the ring still unread
        let at = |r: i32, c: i32| matrix[r as usize][c as usize];
        while top <= bottom && left <= right {
            for c in left..=right {
                out.push(at(top, c)); // along the top
            }
            for r in top + 1..=bottom {
                out.push(at(r, right)); // down the right side
            }
            if top < bottom && left < right {
                // a ring more than one row or column thick
                for c in (left..right).rev() {
                    out.push(at(bottom, c)); // back along the bottom
                }
                for r in (top + 1..bottom).rev() {
                    out.push(at(r, left)); // up the left side
                }
            }
            (top, bottom, left, right) = (top + 1, bottom - 1, left + 1, right - 1);
        }
        out
    }
}
