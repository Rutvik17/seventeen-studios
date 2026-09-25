impl Solution {
    pub fn reverse_list(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
        let mut prev = None; // the part already reversed
        let mut cur = head;
        while let Some(mut node) = cur {
            cur = node.next.take(); // remember the rest before cutting it off
            node.next = prev; // point this node backwards
            prev = Some(node);
        }
        prev
    }
}
