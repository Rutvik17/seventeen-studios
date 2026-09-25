impl Solution {
    pub fn count_components(n: i32, edges: Vec<Vec<i32>>) -> i32 {
        // Union-find: start with n groups; every edge that joins two groups makes one fewer.
        let n = n as usize;
        let mut parent: Vec<usize> = (0..n).collect();
        let mut size = vec![1; n];
        fn find(parent: &mut Vec<usize>, mut x: usize) -> usize {
            while parent[x] != x {
                parent[x] = parent[parent[x]]; // halve the path as we go
                x = parent[x];
            }
            x
        }
        let mut groups = n as i32;
        for e in &edges {
            let (mut ra, mut rb) = (find(&mut parent, e[0] as usize), find(&mut parent, e[1] as usize));
            if ra == rb {
                continue; // already in one group
            }
            if size[ra] < size[rb] {
                std::mem::swap(&mut ra, &mut rb);
            }
            parent[rb] = ra;
            size[ra] += size[rb];
            groups -= 1;
        }
        groups
    }
}
