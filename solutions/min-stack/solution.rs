struct MinStack {
    stack: Vec<(i32, i32)>, // (value, smallest at or below)
}

impl MinStack {
    fn new() -> Self {
        MinStack { stack: Vec::new() }
    }

    fn push(&mut self, val: i32) {
        let smallest = self.stack.last().map_or(val, |&(_, m)| m.min(val));
        self.stack.push((val, smallest));
    }

    fn pop(&mut self) {
        self.stack.pop();
    }

    fn top(&self) -> i32 {
        self.stack.last().unwrap().0
    }

    fn get_min(&self) -> i32 {
        self.stack.last().unwrap().1
    }
}
