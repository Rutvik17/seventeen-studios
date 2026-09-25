use std::cmp::Reverse;
use std::collections::BinaryHeap;

impl Solution {
    pub fn swim_in_water(grid: Vec<Vec<i32>>) -> i32 {
        let n = grid.len() as i32;
        // Like Dijkstra, but a route's cost is its highest cell, not its sum: always extend
        // the route whose highest cell is lowest.
        let mut heap = BinaryHeap::from(vec![Reverse((grid[0][0], 0i32, 0i32))]);
        let mut seen = vec![vec![false; n as usize]; n as usize];
        seen[0][0] = true;
        while let Some(Reverse((t, r, c))) = heap.pop() {
            if r == n - 1 && c == n - 1 {
                return t;
            }
            for (x, y) in [(r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)] {
                if x >= 0 && x < n && y >= 0 && y < n && !seen[x as usize][y as usize] {
                    seen[x as usize][y as usize] = true;
                    heap.push(Reverse((t.max(grid[x as usize][y as usize]), x, y)));
                }
            }
        }
        -1
    }
}
