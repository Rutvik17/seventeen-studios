use std::collections::VecDeque;

impl Solution {
    pub fn oranges_rotting(mut grid: Vec<Vec<i32>>) -> i32 {
        let (rows, cols) = (grid.len() as i32, grid[0].len() as i32);
        let mut rotten = VecDeque::new();
        let mut fresh = 0;
        for r in 0..rows {
            for c in 0..cols {
                match grid[r as usize][c as usize] {
                    2 => rotten.push_back((r, c)),
                    1 => fresh += 1,
                    _ => {}
                }
            }
        }
        let mut minutes = 0;
        // Breadth-first from every rotten orange at once: each round is one minute.
        while !rotten.is_empty() && fresh > 0 {
            for _ in 0..rotten.len() {
                let (i, j) = rotten.pop_front().unwrap();
                for (x, y) in [(i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)] {
                    if x >= 0 && x < rows && y >= 0 && y < cols && grid[x as usize][y as usize] == 1 {
                        grid[x as usize][y as usize] = 2;
                        fresh -= 1;
                        rotten.push_back((x, y));
                    }
                }
            }
            minutes += 1;
        }
        if fresh > 0 { -1 } else { minutes }
    }
}
