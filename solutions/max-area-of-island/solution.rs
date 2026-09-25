impl Solution {
    pub fn max_area_of_island(mut grid: Vec<Vec<i32>>) -> i32 {
        let (rows, cols) = (grid.len() as i32, grid[0].len() as i32);
        let mut best = 0;
        for r in 0..rows {
            for c in 0..cols {
                if grid[r as usize][c as usize] != 1 {
                    continue;
                }
                grid[r as usize][c as usize] = 0; // sink each square as it is counted, so none is counted twice
                let mut stack = vec![(r, c)];
                let mut area = 0;
                while let Some((i, j)) = stack.pop() {
                    area += 1;
                    for (x, y) in [(i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)] {
                        if x >= 0 && x < rows && y >= 0 && y < cols && grid[x as usize][y as usize] == 1 {
                            grid[x as usize][y as usize] = 0;
                            stack.push((x, y));
                        }
                    }
                }
                best = best.max(area);
            }
        }
        best
    }
}
