impl Solution {
    pub fn add_two_numbers(mut l1: Option<Box<ListNode>>, mut l2: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
        let mut dummy = Box::new(ListNode::new(0));
        let mut tail = &mut dummy;
        let mut carry = 0;
        while l1.is_some() || l2.is_some() || carry != 0 {
            let mut total = carry;
            if let Some(node) = l1 {
                total += node.val;
                l1 = node.next;
            }
            if let Some(node) = l2 {
                total += node.val;
                l2 = node.next;
            }
            carry = total / 10; // e.g. 17 -> carry 1, digit 7
            tail.next = Some(Box::new(ListNode::new(total % 10)));
            tail = tail.next.as_mut().unwrap();
        }
        dummy.next
    }
}
