impl Solution {
    pub fn right_side_view(root: Option<Rc<RefCell<TreeNode>>>) -> Vec<i32> {
        let mut out = vec![];
        let mut level: Vec<Rc<RefCell<TreeNode>>> = root.into_iter().collect();
        while let Some(last) = level.last() {
            out.push(last.borrow().val); // the rightmost node of this level
            let mut next = vec![];
            for node in &level {
                let n = node.borrow();
                next.extend(n.left.clone());
                next.extend(n.right.clone());
            }
            level = next;
        }
        out
    }
}
