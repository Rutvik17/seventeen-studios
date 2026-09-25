use std::cmp::Reverse;
use std::collections::BinaryHeap;

impl Solution {
    pub fn merge_k_lists(mut lists: Vec<Option<Box<ListNode>>>) -> Option<Box<ListNode>> {
        // A min-heap holds (front value, which list); the smallest front comes out first.
        let mut heap = BinaryHeap::new();
        for (i, l) in lists.iter().enumerate() {
            if let Some(node) = l {
                heap.push(Reverse((node.val, i)));
            }
        }
        let mut dummy = Box::new(ListNode::new(0));
        let mut tail = &mut dummy;
        while let Some(Reverse((_, i))) = heap.pop() {
            let mut node = lists[i].take().unwrap();
            lists[i] = node.next.take(); // that list's next front
            if let Some(next) = &lists[i] {
                heap.push(Reverse((next.val, i)));
            }
            tail.next = Some(node);
            tail = tail.next.as_mut().unwrap();
        }
        dummy.next
    }
}
