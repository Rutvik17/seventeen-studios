use std::collections::HashMap;

struct DetectSquares {
    col: HashMap<i32, HashMap<i32, i32>>, // x -> {y -> points added there}
}

impl DetectSquares {
    fn new() -> Self {
        DetectSquares { col: HashMap::new() }
    }

    fn add(&mut self, point: Vec<i32>) {
        *self.col.entry(point[0]).or_default().entry(point[1]).or_insert(0) += 1;
    }

    fn count(&self, point: Vec<i32>) -> i32 {
        let (x, y) = (point[0], point[1]);
        let at = |a: i32, b: i32| self.col.get(&a).and_then(|c| c.get(&b)).copied().unwrap_or(0);
        let Some(same) = self.col.get(&x) else { return 0 };
        let mut total = 0;
        // A point straight above or below the query fixes the side length d; the square then
        // lies to the right or to the left, and needs its other two corners.
        for (&y2, &n) in same {
            let d = y2 - y;
            if d == 0 {
                continue;
            }
            for x2 in [x + d, x - d] {
                total += n * at(x2, y) * at(x2, y2);
            }
        }
        total
    }
}
