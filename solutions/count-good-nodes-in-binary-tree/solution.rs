impl Solution {
    pub fn good_nodes(root: Option<Rc<RefCell<TreeNode>>>) -> i32 {
        // best: the largest value on the path from the root.
        fn count(node: &Option<Rc<RefCell<TreeNode>>>, best: i32) -> i32 {
            let Some(n) = node else { return 0 };
            let n = n.borrow();
            let good = if n.val >= best { 1 } else { 0 };
            let best = best.max(n.val);
            good + count(&n.left, best) + count(&n.right, best)
        }
        count(&root, i32::MIN)
    }
}
