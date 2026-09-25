impl Solution {
    pub fn max_path_sum(root: Option<Rc<RefCell<TreeNode>>>) -> i32 {
        // The best sum of a path going down from node (0: take nothing).
        fn gain(node: &Option<Rc<RefCell<TreeNode>>>, best: &mut i32) -> i32 {
            let Some(n) = node else { return 0 };
            let n = n.borrow();
            let left = gain(&n.left, best).max(0); // a negative branch is left off
            let right = gain(&n.right, best).max(0);
            *best = (*best).max(n.val + left + right); // the best path that bends at node
            n.val + left.max(right)
        }
        let mut best = i32::MIN;
        gain(&root, &mut best);
        best
    }
}
