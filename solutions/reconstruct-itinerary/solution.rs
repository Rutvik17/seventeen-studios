use std::collections::HashMap;

impl Solution {
    pub fn find_itinerary(mut tickets: Vec<Vec<String>>) -> Vec<String> {
        tickets.sort_by(|a, b| b.cmp(a));
        let mut out_of: HashMap<String, Vec<String>> = HashMap::new(); // airport -> destinations still to fly to
        for t in tickets {
            out_of.entry(t[0].clone()).or_default().push(t[1].clone()); // reverse order, so popping gives the smallest first
        }
        // Hierholzer's algorithm: fly on while tickets remain; an airport with none left
        // is where the route ends, so it is written down last-first.
        let mut route = vec![];
        let mut stack = vec!["JFK".to_string()];
        while let Some(top) = stack.last().cloned() {
            match out_of.get_mut(&top).and_then(|v| v.pop()) {
                Some(to) => stack.push(to),
                None => route.push(stack.pop().unwrap()),
            }
        }
        route.reverse();
        route
    }
}
