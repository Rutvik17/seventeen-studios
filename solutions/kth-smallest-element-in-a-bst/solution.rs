impl Solution {
    pub fn kth_smallest(root: Option<Rc<RefCell<TreeNode>>>, k: i32) -> i32 {
        // An in-order walk (left, node, right) visits a BST's values in increasing order.
        let mut stack = vec![];
        let mut node = root;
        let mut k = k;
        loop {
            while let Some(n) = node {
                // go as far left as possible, remembering the way back
                node = n.borrow().left.clone();
                stack.push(n);
            }
            let n = stack.pop().unwrap();
            k -= 1;
            if k == 0 {
                return n.borrow().val;
            }
            node = n.borrow().right.clone();
        }
    }
}
