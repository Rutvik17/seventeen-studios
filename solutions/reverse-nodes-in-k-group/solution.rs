impl Solution {
    pub fn reverse_k_group(head: Option<Box<ListNode>>, k: i32) -> Option<Box<ListNode>> {
        // Check that a full group of k exists; if not, leave the rest as it is.
        let mut probe = head.as_ref();
        for _ in 0..k {
            match probe {
                Some(node) => probe = node.next.as_ref(),
                None => return head,
            }
        }
        // Reverse the first k nodes, then attach the rest, itself reversed in groups.
        let mut rest = head;
        let mut group: Option<Box<ListNode>> = None;
        for _ in 0..k {
            let mut node = rest.unwrap();
            rest = node.next.take();
            node.next = group;
            group = Some(node);
        }
        // The group's last node is the original first node: walk to it and hang the rest on.
        let mut tail = group.as_mut().unwrap();
        while tail.next.is_some() {
            tail = tail.next.as_mut().unwrap();
        }
        tail.next = Self::reverse_k_group(rest, k);
        group
    }
}
