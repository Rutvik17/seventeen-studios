impl Solution {
    pub fn valid_tree(n: i32, edges: Vec<Vec<i32>>) -> bool {
        // A tree on n nodes has exactly n - 1 edges and no cycle; together those mean connected.
        if edges.len() as i32 != n - 1 {
            return false;
        }
        let mut parent: Vec<usize> = (0..n as usize).collect();
        fn find(parent: &mut Vec<usize>, mut x: usize) -> usize {
            while parent[x] != x {
                parent[x] = parent[parent[x]]; // halve the path as we go
                x = parent[x];
            }
            x
        }
        for e in &edges {
            let (ra, rb) = (find(&mut parent, e[0] as usize), find(&mut parent, e[1] as usize));
            if ra == rb {
                return false; // already joined: this edge makes a cycle
            }
            parent[ra] = rb;
        }
        true
    }
}
