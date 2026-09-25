impl Solution {
    pub fn lowest_common_ancestor(
        root: Option<Rc<RefCell<TreeNode>>>,
        p: Option<Rc<RefCell<TreeNode>>>,
        q: Option<Rc<RefCell<TreeNode>>>,
    ) -> Option<Rc<RefCell<TreeNode>>> {
        let (p, q) = (p.unwrap().borrow().val, q.unwrap().borrow().val);
        let mut cur = root;
        while let Some(node) = cur {
            let v = node.borrow().val;
            if p < v && q < v {
                cur = node.borrow().left.clone(); // both are in the left subtree
            } else if p > v && q > v {
                cur = node.borrow().right.clone(); // both are in the right subtree
            } else {
                return Some(node); // they split here (or one of them is here)
            }
        }
        None
    }
}
