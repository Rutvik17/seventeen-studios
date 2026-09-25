impl Solution {
    pub fn pacific_atlantic(heights: Vec<Vec<i32>>) -> Vec<Vec<i32>> {
        let (rows, cols) = (heights.len(), heights[0].len());
        // Walk uphill from an ocean's edge: every cell reached can drain down into that ocean.
        let reach = |starts: Vec<(usize, usize)>| {
            let mut seen = vec![vec![false; cols]; rows];
            for &(r, c) in &starts {
                seen[r][c] = true;
            }
            let mut stack = starts;
            while let Some((i, j)) = stack.pop() {
                let (i2, j2) = (i as i32, j as i32);
                for (x, y) in [(i2 + 1, j2), (i2 - 1, j2), (i2, j2 + 1), (i2, j2 - 1)] {
                    if x < 0 || y < 0 || x >= rows as i32 || y >= cols as i32 {
                        continue;
                    }
                    let (x, y) = (x as usize, y as usize);
                    if !seen[x][y] && heights[x][y] >= heights[i][j] {
                        seen[x][y] = true;
                        stack.push((x, y));
                    }
                }
            }
            seen
        };
        let cells = |f: &dyn Fn(usize, usize) -> bool| -> Vec<(usize, usize)> { (0..rows).flat_map(|r| (0..cols).map(move |c| (r, c))).filter(|&(r, c)| f(r, c)).collect() };
        let pacific = reach(cells(&|r, c| r == 0 || c == 0));
        let atlantic = reach(cells(&|r, c| r == rows - 1 || c == cols - 1));
        cells(&|r, c| pacific[r][c] && atlantic[r][c]).into_iter().map(|(r, c)| vec![r as i32, c as i32]).collect()
    }
}
