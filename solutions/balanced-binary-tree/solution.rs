impl Solution {
    pub fn is_balanced(root: Option<Rc<RefCell<TreeNode>>>) -> bool {
        // The height, or -1 as soon as anything below is unbalanced.
        fn height(node: &Option<Rc<RefCell<TreeNode>>>) -> i32 {
            let Some(n) = node else { return 0 };
            let n = n.borrow();
            let (left, right) = (height(&n.left), height(&n.right));
            if left < 0 || right < 0 || (left - right).abs() > 1 {
                return -1;
            }
            1 + left.max(right)
        }
        height(&root) >= 0
    }
}
