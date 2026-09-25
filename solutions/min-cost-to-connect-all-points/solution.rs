impl Solution {
    pub fn min_cost_connect_points(points: Vec<Vec<i32>>) -> i32 {
        // Prim's algorithm on the complete graph: grow one tree from point 0, always
        // adding the outside point that is cheapest to connect to it.
        let n = points.len();
        let mut cost = vec![i32::MAX; n]; // cheapest link from each outside point to the tree
        cost[0] = 0;
        let mut inside = vec![false; n];
        let mut total = 0;
        for _ in 0..n {
            let u = (0..n).filter(|&i| !inside[i]).min_by_key(|&i| cost[i]).unwrap();
            inside[u] = true;
            total += cost[u];
            for v in 0..n {
                // u may offer a cheaper link to the points still outside
                if !inside[v] {
                    let d = (points[u][0] - points[v][0]).abs() + (points[u][1] - points[v][1]).abs();
                    cost[v] = cost[v].min(d);
                }
            }
        }
        total
    }
}
