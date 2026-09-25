impl Solution {
    pub fn car_fleet(target: i32, position: Vec<i32>, speed: Vec<i32>) -> i32 {
        let mut cars: Vec<(i32, i32)> = position.into_iter().zip(speed).collect();
        cars.sort_unstable_by(|a, b| b.0.cmp(&a.0)); // nearest the target first
        let (mut fleets, mut slowest) = (0, 0.0f64); // slowest: arrival of the fleet ahead
        for (p, s) in cars {
            let t = (target - p) as f64 / s as f64; // arrival on its own
            if t > slowest {
                fleets += 1; // cannot catch up: a new fleet
                slowest = t;
            }
        }
        fleets
    }
}
