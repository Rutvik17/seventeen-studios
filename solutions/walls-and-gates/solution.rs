use std::collections::VecDeque;

impl Solution {
    pub fn walls_and_gates(rooms: &mut Vec<Vec<i32>>) {
        const INF: i32 = i32::MAX; // an empty room not yet reached
        let (rows, cols) = (rooms.len() as i32, rooms[0].len() as i32);
        // Breadth-first from every gate at once: a room is first reached from its nearest gate.
        let mut queue = VecDeque::new();
        for r in 0..rows {
            for c in 0..cols {
                if rooms[r as usize][c as usize] == 0 {
                    queue.push_back((r, c));
                }
            }
        }
        while let Some((i, j)) = queue.pop_front() {
            for (x, y) in [(i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)] {
                if x >= 0 && x < rows && y >= 0 && y < cols && rooms[x as usize][y as usize] == INF {
                    rooms[x as usize][y as usize] = rooms[i as usize][j as usize] + 1;
                    queue.push_back((x, y));
                }
            }
        }
    }
}
