impl Solution {
    pub fn max_depth(root: Option<Rc<RefCell<TreeNode>>>) -> i32 {
        // An empty tree has depth 0; otherwise one for this node plus the deeper side.
        match root {
            None => 0,
            Some(node) => {
                let n = node.borrow();
                1 + Self::max_depth(n.left.clone()).max(Self::max_depth(n.right.clone()))
            }
        }
    }
}
