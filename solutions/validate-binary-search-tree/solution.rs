impl Solution {
    pub fn is_valid_bst(root: Option<Rc<RefCell<TreeNode>>>) -> bool {
        // Every node must lie strictly between the bounds its ancestors set.
        fn ok(node: &Option<Rc<RefCell<TreeNode>>>, lo: i64, hi: i64) -> bool {
            let Some(n) = node else { return true };
            let n = n.borrow();
            let v = n.val as i64;
            lo < v && v < hi && ok(&n.left, lo, v) && ok(&n.right, v, hi)
        }
        ok(&root, i64::MIN, i64::MAX) // wider than any i32, so no value is excluded
    }
}
