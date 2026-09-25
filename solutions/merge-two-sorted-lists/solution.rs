impl Solution {
    pub fn merge_two_lists(mut list1: Option<Box<ListNode>>, mut list2: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
        let mut dummy = Box::new(ListNode::new(0)); // a placeholder in front of the result
        let mut tail = &mut dummy;
        while list1.is_some() && list2.is_some() {
            // Take the smaller head off its list and hang it on the tail.
            let from = if list1.as_ref().unwrap().val <= list2.as_ref().unwrap().val { &mut list1 } else { &mut list2 };
            let mut node = from.take().unwrap();
            *from = node.next.take();
            tail.next = Some(node);
            tail = tail.next.as_mut().unwrap();
        }
        tail.next = list1.or(list2); // whatever is left is already sorted
        dummy.next
    }
}
