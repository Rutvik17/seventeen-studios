use std::cmp::Reverse;
use std::collections::BinaryHeap;

struct KthLargest {
    // A min-heap of the k largest so far: its top, the smallest of them, is the k-th largest.
    heap: BinaryHeap<Reverse<i32>>,
    k: usize,
}

impl KthLargest {
    fn new(k: i32, nums: Vec<i32>) -> Self {
        let mut me = KthLargest { heap: BinaryHeap::new(), k: k as usize };
        for x in nums {
            me.add(x);
        }
        me
    }

    fn add(&mut self, val: i32) -> i32 {
        self.heap.push(Reverse(val));
        if self.heap.len() > self.k {
            self.heap.pop(); // no longer among the k largest
        }
        self.heap.peek().unwrap().0
    }
}
