impl Solution {
    pub fn reorder_list(head: &mut Option<Box<ListNode>>) {
        // 1. Count, and cut the list after its first half (the front keeps the middle node).
        let mut n = 0;
        let mut cur = head.as_ref();
        while let Some(node) = cur {
            n += 1;
            cur = node.next.as_ref();
        }
        let mut tail = head.as_mut();
        for _ in 0..(n - 1) / 2 {
            tail = tail.unwrap().next.as_mut();
        }
        let mut second = tail.and_then(|node| node.next.take());
        // 2. Reverse the second half.
        let mut rev = None;
        while let Some(mut node) = second {
            second = node.next.take();
            node.next = rev;
            rev = Some(node);
        }
        // 3. Weave them together: one from the front, one from the (reversed) back.
        let mut first = head.as_mut();
        while let Some(node) = first {
            if let Some(mut back) = rev {
                rev = back.next.take();
                back.next = node.next.take();
                node.next = Some(back);
                first = node.next.as_mut().unwrap().next.as_mut();
            } else {
                break;
            }
        }
    }
}
