impl Solution {
    pub fn invert_tree(root: Option<Rc<RefCell<TreeNode>>>) -> Option<Rc<RefCell<TreeNode>>> {
        if let Some(node) = &root {
            let mut n = node.borrow_mut();
            // Swap the children, then mirror each of them the same way.
            let (left, right) = (n.left.take(), n.right.take());
            n.left = Self::invert_tree(right);
            n.right = Self::invert_tree(left);
        }
        root
    }
}
