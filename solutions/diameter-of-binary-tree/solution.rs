impl Solution {
    pub fn diameter_of_binary_tree(root: Option<Rc<RefCell<TreeNode>>>) -> i32 {
        fn height(node: &Option<Rc<RefCell<TreeNode>>>, best: &mut i32) -> i32 {
            let Some(n) = node else { return 0 };
            let n = n.borrow();
            let (left, right) = (height(&n.left, best), height(&n.right, best));
            *best = (*best).max(left + right); // the longest path that bends at node
            1 + left.max(right)
        }
        let mut best = 0;
        height(&root, &mut best);
        best
    }
}
