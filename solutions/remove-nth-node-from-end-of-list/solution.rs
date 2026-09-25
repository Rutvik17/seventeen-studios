impl Solution {
    pub fn remove_nth_from_end(head: Option<Box<ListNode>>, n: i32) -> Option<Box<ListNode>> {
        // Rust's ownership rules allow only one mutable pointer into a list, so instead of two
        // pointers n apart, count the length first: the node to remove is (len - n) from the front.
        let mut len = 0;
        let mut cur = head.as_ref();
        while let Some(node) = cur {
            len += 1;
            cur = node.next.as_ref();
        }
        let mut dummy = Box::new(ListNode { val: 0, next: head }); // no special case for the head
        let mut before = &mut dummy;
        for _ in 0..(len - n) {
            before = before.next.as_mut().unwrap();
        }
        let removed = before.next.take();
        before.next = removed.and_then(|node| node.next);
        dummy.next
    }
}
