impl Solution {
    pub fn find_redundant_connection(edges: Vec<Vec<i32>>) -> Vec<i32> {
        // Union-find: each node points toward a representative of its connected group.
        let n = edges.len() + 1;
        let mut parent: Vec<usize> = (0..n).collect();
        let mut size = vec![1; n];
        fn find(parent: &mut Vec<usize>, mut x: usize) -> usize {
            while parent[x] != x {
                parent[x] = parent[parent[x]]; // halve the path as we go
                x = parent[x];
            }
            x
        }
        for e in &edges {
            let (mut ra, mut rb) = (find(&mut parent, e[0] as usize), find(&mut parent, e[1] as usize));
            if ra == rb {
                return e.clone(); // already connected: this edge closes a cycle
            }
            if size[ra] < size[rb] {
                std::mem::swap(&mut ra, &mut rb);
            }
            parent[rb] = ra; // hang the smaller group under the larger
            size[ra] += size[rb];
        }
        vec![]
    }
}
