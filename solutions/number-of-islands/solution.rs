impl Solution {
    pub fn num_islands(mut grid: Vec<Vec<char>>) -> i32 {
        let (rows, cols) = (grid.len() as i32, grid[0].len() as i32);
        let mut islands = 0;
        for r in 0..rows {
            for c in 0..cols {
                if grid[r as usize][c as usize] != '1' {
                    continue;
                }
                islands += 1; // new land: sink the whole island so it is counted once
                grid[r as usize][c as usize] = '0';
                let mut stack = vec![(r, c)];
                while let Some((i, j)) = stack.pop() {
                    for (x, y) in [(i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)] {
                        if x >= 0 && x < rows && y >= 0 && y < cols && grid[x as usize][y as usize] == '1' {
                            grid[x as usize][y as usize] = '0';
                            stack.push((x, y));
                        }
                    }
                }
            }
        }
        islands
    }
}
